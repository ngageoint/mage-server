# ClamAV Plugin

Scans observation attachment content for viruses/malware before it's made available, using a running ClamAV daemon (`clamd`). Infected or unscannable attachments are rejected rather than exposed.

## How it works

Unlike SFTP/ArcGIS, this plugin doesn't run its own polling loop — it registers a single hook into MAGE core's shared attachment-processing pipeline (`main.impl.attachment_processing.ts`), which already stages every uploaded attachment and periodically runs it through whatever hooks any enabled plugin has registered.

1. An attachment is uploaded and staged (core mechanism, not clamav-specific)
2. Core's background job picks up the staged file and runs the registered hooks against it — `clamavHook` is one of them
3. `clamavHook` streams the staged file's bytes to `clamd` over a raw TCP socket using the `INSTREAM` protocol (`scan.ts` — not the `clamdscan` CLI)
4. `clamd`'s reply is parsed: `stream: OK` → pass, `stream: <Signature> FOUND` → reject with the signature name as the reason, anything else (including socket errors/timeout) → error
5. Core turns that outcome into the attachment's `processingStatus`:
   - **pass** → `success` — staged content is finalized and made available
   - **reject** → `rejected` — staged content is deleted; reason and hook name are recorded, content is never finalized
   - **error** → `pending` and retried on the next cycle, up to a configured retry limit, then `error` if retries are exhausted

## Package structure

```
plugins/clamav/
└── service/
    └── src/
        ├── index.ts     # Plugin init hook — registers clamavHook as an attachment hook
        ├── clamHook.ts  # AttachmentHook implementation — wraps scan() and maps outcomes
        └── scan.ts      # Raw ClamAV INSTREAM protocol client (TCP socket to clamd)
```

There is no `web-app`/`web` package. Unlike SFTP and ArcGIS, this plugin has no admin UI panel — it's configured entirely by environment variables and, once enabled, scans every attachment on every event unconditionally.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `MAGE_CLAMAV_HOST` | `localhost` | Hostname/IP of the `clamd` daemon |
| `MAGE_CLAMAV_PORT` | `3310` | TCP port `clamd` listens on |

To enable the plugin, add `@ngageoint/mage.clamav.service` to `servicePlugins` in `instance/config.js` (or the `MAGE_PLUGINS` env var, as `docker-compose.yml` already does). There is no `webUIPlugins` entry — nothing to add on the client side.

## Current capabilities

- Scans every attachment, on any event/form field, that goes through the standard staged-upload path, before it is finalized
- Three outcomes: clean content passes through normally; malicious content is rejected (never finalized, reason shown); a scan that can't complete (e.g. `clamd` unreachable) is retried before giving up
- The web app treats `rejected`/`error` attachments as failed uploads in both the attachment detail view (`attachment.component.ts`) and the observation list's compact card badge (`observation-list-item.component.ts`) — gated content is never exposed while pending or rejected

## Not yet supported

- No per-event or per-form opt-out — every attachment is scanned unconditionally once the plugin is enabled
- No signature-update management — assumes an externally managed `clamd` with its own `freshclam` setup
- No admin UI — nothing to configure beyond the two environment variables
- Only observation attachments are covered. Other upload paths (user avatars, form/observation icons, layer imports) do not go through `AttachmentStore` staging and are not scanned

## Local development (Docker)

`docker-compose.yml` already defines a `mage-clamav` service (`clamav/clamav:stable`) and wires `MAGE_CLAMAV_HOST`/`MAGE_CLAMAV_PORT` to it.

1. Add `@ngageoint/mage.clamav.service` to `servicePlugins` in the `MAGE_PLUGINS` env var (already done in this repo's `docker-compose.yml`)
2. `docker compose up --build -d`
3. Upload an attachment — clean files upload normally; an [EICAR test file](https://www.eicar.org/download-anti-malware-testfile/) will be flagged `rejected`
