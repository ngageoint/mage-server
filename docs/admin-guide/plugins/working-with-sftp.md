# Working with SFTP

## What's the SFTP Plugin?

The SFTP plugin automatically exports observations to a remote SFTP server as they're created or updated — useful when field data needs to flow into an external system (a data warehouse, analysis pipeline, or archive) without anyone manually exporting it. It runs on its own schedule in the background; nothing about it is visible to regular users.

## Note

Configured entirely under **Plugins → SFTP** in the admin panel (see [Working with Plugins](working-with-plugins.md) for how plugin tabs work). The plugin must also be enabled in server configuration to appear there at all.

## Configuring the Plugin

The **Configuration** tab has two cards:

**SFTP Plugin Configuration**
1. **Enabled** — master on/off switch. Nothing runs while this is off.
2. **Observation SFTP Rule** — **Create** exports new observations only; **Create And Update** also re-exports an observation whenever it's edited.
3. **Observation Create Timeout** — how long (minutes) to wait for an observation's attachments to finish uploading before exporting it anyway with whatever is available.
4. **Poll Interval** — how often (seconds) the plugin checks for new or changed observations.
5. **Page Size** — how many observations are queried per database page; lower this if the server is memory-constrained.
6. **Event Filter Mode** — **All Events**, **Include Events** (only sync the events you pick), or **Exclude Events** (sync everything except the events you pick).

**SFTP Client Options**
1. **SFTP Host**, **Port**, **Path**, **Username** — the remote server's connection details. The remote path must already exist; the plugin won't create it.
2. **Private Key** — authentication is key-based only (no password auth yet). Paste an OpenSSH private key via **Add/Replace Private Key**; once saved, it's never shown again, only a "Private key is configured" status.
3. **Test Connection** — verifies the host/port/path/key combination works before you save, without needing a full sync cycle to find out.

Click **Save Configuration** to apply changes, or **Reset to Defaults** to discard them.

## Checking Sync Status

The **Sync Status** tab has two views:

- **Sync Health** — one row per event, flagging which ones have failed or stuck-pending exports. Toggle **Show all events** to see healthy events too.
- **Observation Records** — pick an event to see every observation's export status (**Success**, **Failed**, **Pending**, **Skipped**), filterable by status. Each row has a retry action (**Retry** for failed, **Send** for skipped, **Resend** for already-successful), and **Retry All Failed** / **Send All Skipped** apply it in bulk. These buttons just mark the observation to be re-attempted on the next poll cycle — they don't upload immediately.

Statuses:
- **Success** — exported.
- **Failed** — archive creation or upload failed.
- **Pending** — waiting on attachments (or genuinely stuck, if past the configured timeout).
- **Skipped** — the observation existed before the plugin started tracking that event; it won't be exported unless you manually **Send** it.

## Common Issues

**An observation stays Pending.** Normal if it's within the configured Create Timeout — it's still waiting on attachments. If it's older than that, it's stuck; use **Retry** to requeue it.

**Old observations aren't showing up in exports.** Observations that existed before the plugin started tracking an event are marked **Skipped**, not exported automatically — use **Send** (or **Send All Skipped**) to push them through.

**The "Observation SFTP Success Action" setting doesn't seem to do anything.** That's accurate as of this writing — the **None**/**Archive** choice is present in the UI and saved with the rest of the configuration, but nothing in the plugin currently reads or acts on it. Don't rely on it to archive observations after a successful export.

**Test Connection fails but the server looks reachable.** Check the specific message — a failure naming the remote path (not the host) usually means the path doesn't exist on the server yet; the plugin won't create it for you.

## Learn More

- [Working with Plugins](working-with-plugins.md) — how plugin tabs work in general
- [Working with Observations](../../user-guide/working-with-observations.md) — what an observation's attachments and form data actually are
