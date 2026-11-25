# Working with ArcGIS

## What's the ArcGIS Plugin?

The ArcGIS plugin syncs MAGE observations to one or more ArcGIS Feature Service layers in near real-time. New observations, edits, and deletions in MAGE are reflected in the configured ArcGIS layers on the plugin's next poll cycle. Sync is one-way, out of MAGE — this plugin doesn't bring ArcGIS data into MAGE.

## Note

The admin page (**Plugins → ArcGIS**) has five tabs: **Processing**, **Feature Layers**, **Events**, **Attributes**, **Mappings**. Setup order matters — you can't map an event to a layer until a feature service and at least one layer exist in **Feature Layers**.

## Connecting a Feature Service

1. In **Feature Layers**, add a feature service.
2. Choose **I have a URL** (paste a Feature Service URL directly) or **Browse a Portal** (search a connected ArcGIS portal for available services).
3. Pick an authentication method: **OAuth** (recommended — token auto-refreshes), **Token** (a short-lived API key generated externally), or **Username/Password** (ArcGIS Enterprise local accounts).
4. Click **Create Feature Server** to validate the connection. If credentials later expire, reopen the same dialog to re-authenticate — it becomes **Update Feature Server**.
5. In the **Layers** section of the same dialog, select which layer(s) on that service MAGE should sync to. A layer marked with `*` doesn't appear to allow editing for the connected account — syncing to it may fail.

## Mapping Events to Layers

In the **Events** tab, each MAGE event has a sync toggle — it stays disabled until at least one layer is selected for that event. Expanding an event lets you:
- Choose which of the configured layer(s) that event sends observations to.
- Optionally sync only observations from a specific date/time forward, instead of syncing everything that already exists in the event.

## Processing Settings

The **Processing** tab controls the sync engine itself:
- **Enable Observation Processing** — master switch; nothing runs while it's off.
- **Base URL** — the MAGE server's own address, used for the ArcGIS OAuth redirect.
- **Interval** — how often (seconds) the plugin checks for new or changed observations.
- **Startup Interval** — how long to wait after server startup before the first poll.
- **Update Interval** — poll frequency specifically while pending updates exist.
- **Batch Size** — max observations processed per interval.
- **Attachment Tolerance** — time tolerance (ms) when deciding whether an attachment counts as modified relative to its observation.

**Reset Config** wipes the entire plugin configuration — feature layers, event sync, field mappings, and attributes — back to defaults. This cannot be undone.

## Checking Sync Status

Below the Events tab, **Push Status** shows every observation already synced to ArcGIS for a selected event: its status, how many attachments made it across, its coordinates, and timestamps. Per-layer counts are shown side by side, with a mismatch between layers flagged visually.

## Advanced: Attributes and Mappings

Two tabs let you customize exactly how MAGE data lands in ArcGIS — useful once the default setup is already syncing, not required to get started:
- **Attributes** — rename the built-in ArcGIS fields MAGE writes to by default (observation ID, event ID/name, user ID/username/display name, device ID, timestamps, geometry type, icon symbol).
- **Mappings** — map specific MAGE form fields to custom ArcGIS attributes per event/form, and configure per-attribute behavior (concatenating multiple values, translating specific values, conditional defaults, or omitting an attribute entirely).

Every field in both tabs has an inline info icon explaining exactly what it does.

## Common Issues

**"Credentials for feature service X are invalid or expired."** A banner at the top of the admin page calls this out directly, with a **Fix Now** shortcut to Feature Layers to re-authenticate. Affected events stop syncing until it's resolved.

**I can't turn on sync for an event.** The event's toggle in the Events tab stays disabled until at least one layer is selected for it — add a feature service and layer first.

**An event's observations aren't reaching the layer.** Check Push Status for that event — a non-success status, or mismatched counts across layers, points to where it's failing. Also check whether the target layer allows editing for the connected account (the `*` marker in the add-service dialog).

**I reset the config by accident.** There's no undo — it wipes feature layers, event sync, mappings, and attributes together. Feature services and event mappings need to be set up again from scratch.

## Learn More

- [Working with Plugins](working-with-plugins.md) — how plugin tabs work in general
- [Working with Observations](../../user-guide/working-with-observations.md) — what an observation's form fields, geometry, and attachments actually are
- [Working with Events](../../user-guide/working-with-events.md) — what an event scopes, from a field user's side
