# MAGE Pre-Disk Attachment Scan – Comprehensive Summary (Updated)

## Purpose
Document all work, understanding, decisions, and implementation details regarding MAGE attachments, **pre-disk virus scanning**, and Observation handling. This includes lifecycle, backend wiring, ClamAV integration, debugging lessons, and final architectural invariants.

---

## 1. Context & Track

- **Origin**: Work initiated from GitLab tickets covering the full pre-disk attachment scanning track for MAGE Observations.
- **Primary Goal**: Guarantee that **all attachment bytes are scanned for viruses before**:
  - Any filesystem write
  - Any MongoDB attachment metadata commit
- **Key Invariant (now explicit and enforced)**:
  > **Busboy stream → ClamAV scan → clean stream → storage**

- **Tracking**: Multiple GitLab tickets (IDs omitted for security) define incremental requirements: discovery, proof-of-concept, controller interception, and final enforcement.

- **Challenges encountered**:
  - Strict Observation prerequisites caused false negatives during testing
  - Confusion between frontend rendering behavior vs backend success
  - Attempting to debug Node streams from the browser console
  - Overuse of breakpoints inside async stream callbacks
  - Repeated assumptions without validating execution context → **“Mission Stupid”**

---

## 2. MAGE Attachment Lifecycle (Authoritative)

### 2.1 Observation Creation (Hard Requirements)
An Observation **must** have:
- Event
- User
- Team
- Map Layer
- Form containing **at least one Attachment-type field**

Without all of the above, attachments may upload but will **not render** in the UI.

---

### 2.2 Attachment Submission (Front-End)

- User selects:
  - Form → Attachment field → local file
- Front-end issues:
  ```
  PUT /api/events/:eventId/observations/:observationId/attachments/:attachmentId
  ```
- Browser **never sees file bytes again** after upload
- UI rendering depends on Observation validity, not upload success alone

---

### 2.3 Backend Handling (Critical Path)

**Primary controller**:
```
service/src/adapters/observations/adapters.observations.controllers.web.ts
```

Flow:
1. Express route initializes **Busboy**
2. Busboy emits `file` event
3. Raw upload stream is received **in-memory**
4. **NEW**: Stream is scanned via ClamAV **before** any persistence
5. Only a clean stream proceeds to storage
6. Storage layer writes:
   - File bytes to disk
   - Attachment metadata to MongoDB

---

### 2.4 Attachment Retrieval

- List attachments:
  ```
  GET /api/events/:eventId/observations/:observationId/attachments
  ```
- Fetch attachment bytes:
  ```
  GET /api/events/:eventId/observations/:observationId/attachments/:attachmentId?access_token=...
  ```

MongoDB stores attachment metadata as **embedded documents** within the Observation.

---

## 3. ClamAV Integration (Final Design)

### 3.1 Implementation File (New)

```
service/src/adapters/observations/adapters.attachments.clamav.ts
```

### 3.2 Responsibilities

- Accept a **Readable stream** (Busboy file stream)
- Pipe bytes to ClamAV via stdin
- Interpret ClamAV exit codes:
  - `0` → clean
  - `1` → virus detected
  - `>1` → scanner error
- Return a **new readable stream** containing clean bytes
- Throw on detection or error

### 3.3 Key Design Decision

- **No byte peeking, logging, or buffering for debugging**
- Stream safety and correctness > observability
- Virus detection is authoritative; no partial writes allowed

---

## 4. Controller Wiring (What Actually Changed)

### 4.1 Exact Hook Point

Inside:
```
.on('file', async (fieldName, stream, info) => { ... })
```

### 4.2 Critical Change

- **Before**: raw Busboy stream passed directly to `storeAttachmentContent()`
- **After**:
  1. `scanAttachmentWithClamAV(stream)`
  2. Receive clean stream
  3. Pass clean stream to storage

### 4.3 Failure Behavior

- Virus detected → request rejected
- No disk write
- No MongoDB attachment commit
- Upload fails fast and safely

---

## 5. Debugging Reality (Hard Lessons)

### 5.1 Where Logs Actually Appear

- `console.log` in controllers → **Node terminal**, not browser DevTools
- Browser DevTools only shows **frontend JS**, never backend logs

### 5.2 VS Code Debugger Truth

- "Debug MAGE Backend" **is** a Node debugger
- Breakpoints:
  - Cannot reliably bind to inline arrow callbacks
  - Must be placed on named functions or executable statements
- Stepping into Busboy callbacks is unreliable due to async stream timing

### 5.3 What Did NOT Help

- Logging stream chunks
- Trying to view bytes in DevTools
- Adding repeated `data` handlers
- Inspecting `ReadableState` internals

> Seeing bytes was **never required** to validate correctness.

---

## 6. Front-End Notes (Clarified)

- Attachment rendering depends on:
  - Valid Observation
  - Form contains Attachment field
- UI buttons (Activate / Complete) do **not** reflect attachment readiness
- Successful upload ≠ visible attachment

---

## 7. Backend Structure (Relevant Only)

```
mage-server/service/
├── src/
│   ├── adapters/
│   │   └── observations/
│   │       ├── adapters.observations.controllers.web.ts
│   │       ├── adapters.attachments.clamav.ts   ← NEW
│   │       └── adapters.observations.db.mongoose.ts
```

MongoDB updates:
- Attachments updated via `$set` and `$elemMatch`
- No structural changes required for scanning

---

## 8. Network / API Confirmation

- Metadata confirmed stored correctly
- Retrieval endpoints verified
- Token-based access confirmed

Example attachment metadata:
```json
{
  "id": "6984cf0ec088cb625ee0922c",
  "fieldName": "thurspm_attachment",
  "url": "...",
  "contentStored": true
}
```

---

## 9. Lessons Learned / Rules Going Forward

1. **Never assume execution context** (browser vs Node)
2. **Do not debug streams by logging bytes**
3. Breakpoints ≠ execution guarantees in async streaming code
4. Observation setup errors masquerade as attachment bugs
5. Enforce invariants in code, not via debugging

---

## ✅ Current Status (Updated)

- ✅ ClamAV streaming scan implemented
- ✅ Pre-disk invariant enforced
- ✅ Controller correctly intercepts upload stream
- ✅ Clean stream only reaches storage
- ✅ Infected files are rejected early
- ✅ No dependency on byte inspection or debugging hacks

**System is now ready for:**
- EICAR test validation
- Timeout / resilience hardening
- Ticket closure and PR