# MAGE SFTP Plugin

Automatically exports MAGE observations to a remote SFTP server as they are created or updated. Designed for operational environments where field data needs to flow into an external system (data warehouse, analysis pipeline, archive) without manual intervention.

---

## How It Works

The plugin runs a background polling loop on a configurable interval (default: 60 seconds). On each tick it:

1. Queries for new or updated observations across active MAGE events
2. Packages each observation as a `.zip` archive containing a GeoJSON file and any media attachments
3. Uploads the archive to the configured SFTP server
4. Records the sync status of each observation in MongoDB

Uploads are tracked individually per observation so failures can be retried and the admin can see the sync state of every record.

---

## Archive Format

Each observation is exported as `{observationId}.zip` containing:

- **`observation.geojson`** — a GeoJSON Feature with:
  - The observation's geometry
  - Event name and ID
  - Submitting user's display name
  - All form field values, keyed by field title
  - File paths to any attachments within the zip
- **`media/{attachmentId}/{filename}`** — one entry per attachment

If an observation has attachments that haven't finished uploading yet, the plugin marks it `PENDING` and retries it on the next cycle until a configurable timeout is reached, at which point it uploads whatever is available.

---

## Sync Status

Every observation processed by the plugin gets a status record in MongoDB:

| Status | Meaning |
|---|---|
| `SUCCESS` | Archive uploaded successfully |
| `FAILED` | Archive creation or upload failed |
| `PENDING` | Attachments incomplete — will retry |
| `SKIPPED` | Observation predated the plugin start; not uploaded |

---

## Configuration

Configured through the MAGE admin panel under **Admin → Plugins → SFTP**. Key settings:

| Setting | Description | Default |
|---|---|---|
| Enabled | Master on/off switch | `false` |
| Interval | How often to poll for new observations (seconds) | `60` |
| Trigger rule | `Create` = new observations only; `CreateAndUpdate` = also re-upload on edits | `CreateAndUpdate` |
| Attachment timeout | Seconds to wait for attachments before uploading incomplete archive | `60` |
| Event filter | Sync all events, or include/exclude a specific list | All |
| SFTP host / port / path | Remote server connection details | — |
| SFTP username | Login username for the remote server | — |

Authentication uses a private key file. The key is provided via the admin UI and stored on the server; its path is set via the `MAGE_SFTP_KEY_FILE` environment variable.

---

## Package Structure

```
plugins/sftp/
├── service/          # Node.js backend — polling loop, SFTP client, MongoDB status tracking
│   └── src/
│       ├── index.ts                        Plugin entry point + Express routes
│       ├── controller/controller.ts        Core sync loop and orchestration
│       ├── adapters/
│       │   ├── adapters.sftp.mongoose.ts   MongoDB status model and repository
│       │   └── adapters.sftp.teams.ts      Teams lookup
│       ├── configuration/SFTPPluginConfig.ts  Config interface and defaults
│       └── format/
│           ├── entities.format.ts          Archive types and factory
│           └── geojson.ts                  GeoJSON + zip formatter
└── web/              # Angular admin UI — configuration form served as a plugin tab
```
