# Working with ClamAV

## What's the ClamAV Plugin?

ClamAV scans observation attachments (photos, videos, files) for viruses and malware before they're made available to anyone, using a running ClamAV daemon (`clamd`). Infected or unscannable attachments are rejected instead of being exposed.

## Note

This plugin has no admin screen — see [Working with Plugins](working-with-plugins.md) for why. It's configured entirely through server environment variables (`MAGE_CLAMAV_HOST`, `MAGE_CLAMAV_PORT`) and, once enabled, scans every attachment on every event automatically. There's nothing for an admin to set up or click in the web app itself.

## How It Works

1. A user uploads an attachment on an observation, same as always.
2. The attachment is scanned in the background before it's finalized.
3. One of three outcomes follows:
   - **Clean** — the attachment is made available normally.
   - **Infected** — the attachment is rejected and never finalized; the reason (the matched virus signature) is recorded.
   - **Scan couldn't complete** (e.g. the ClamAV daemon is unreachable) — retried automatically; if retries run out, it's marked as an error.

## What Users See

A rejected or errored attachment shows as a placeholder card with the file name and "Click for more details" — expanding it shows the specific reason, including the signature name for a confirmed infection. It never shows as a normal photo/file preview, and it's flagged on both the observation's attachment list and its compact card in the observations list.

## Common Issues

**A user says an attachment won't upload / shows as rejected.** Open the attachment and expand the detail message. A named virus signature means the file was genuinely flagged — it's expected to be rejected. A generic scan-failure message (not a signature match) instead points to the ClamAV daemon itself being unreachable — that's a server-side issue for whoever manages the deployment, not something fixable from the admin panel.

**I don't see a Plugins tab for ClamAV.** Expected — this plugin has no admin UI by design (see [Working with Plugins](working-with-plugins.md)).

**Only some uploads are covered.** Scanning applies to observation attachments only. User avatars, form/observation icons, and layer imports don't go through this scan.

## Learn More

- [Working with Plugins](working-with-plugins.md) — why some plugins have no admin screen
- [Working with Observations](../../user-guide/working-with-observations.md) — attaching files to an observation
