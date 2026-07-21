# ArcGIS Plugin

Synchronizes MAGE observation data to one or more ArcGIS Feature Service layers in near real-time. New observations, edits, and deletions in MAGE are reflected in the configured ArcGIS layers on the next poll cycle.

## How it works

The plugin runs a background polling loop (`ObservationProcessor`) that wakes up on a configurable interval and:

1. Queries all active MAGE events that are mapped to at least one ArcGIS feature layer
2. Fetches observations modified since the last poll
3. Transforms each observation into an ArcGIS feature (`ObservationsTransformer`)
4. Sends adds, updates, and deletions to each mapped feature layer (`FeatureLayerProcessor`)
5. Handles geometry-type changes (e.g. point → polygon) by removing the old feature and adding a new one
6. Handles event deletions by removing the associated features from ArcGIS

On the first run after startup the processor checks all configured layers for out-of-date features before querying for new observations.

## Package structure

```
plugins/arcgis/
├── service/                  # Node.js service plugin
│   └── src/
│       ├── index.ts                      # Plugin init hook + REST routes
│       ├── ArcGISService.ts              # Identity/auth management
│       ├── ObservationProcessor.ts       # Main polling loop
│       ├── ObservationsTransformer.ts    # MAGE → ArcGIS feature mapping
│       ├── FeatureLayerProcessor.ts      # Per-layer add/update/delete logic
│       ├── FeatureService.ts             # ArcGIS REST client wrapper
│       ├── FeatureServiceAdmin.ts        # Layer schema management
│       ├── EventTransform.ts             # Per-event field mapping
│       ├── GeometryChangedHandler.ts     # Handles geometry type changes
│       ├── EventDeletionHandler.ts       # Cleans up features for deleted events
│       ├── EventLayerProcessorOrganizer.ts
│       ├── ArcObjects.ts                 # Batches adds/updates/deletes
│       ├── ObservationBins.ts
│       ├── ObservationsSender.ts
│       ├── FeatureQuerier.ts
│       ├── LayerInfo.ts
│       └── types/
│           ├── ArcGISPluginConfig.ts     # Top-level plugin config interface + defaults
│           ├── ArcGISConfig.ts           # FeatureServiceConfig, FeatureLayerConfig, AttributeConfig
│           └── ...
└── web-app/                  # Angular admin UI
    └── projects/main/src/lib/
        ├── arc-admin/        # Top-level admin panel component
        ├── arc-layer/        # Feature layer add/edit/delete dialogs
        └── arc-event/        # Event-to-layer mapping UI
```

## Authentication methods

The plugin supports three authentication methods for connecting to an ArcGIS Feature Service:

| Method | When to use |
|---|---|
| **OAuth** | ArcGIS Online or Enterprise with registered OAuth app — recommended for production |
| **Token** | Short-lived ArcGIS token (generated externally) |
| **Username / Password** | ArcGIS Enterprise with local accounts |

OAuth tokens are automatically refreshed and persisted back to the plugin state store via `ArcGISIdentityService`.

## Configuration reference

The plugin config is stored in the MAGE plugin state repository (MongoDB). All fields except `enabled` and `featureServices` have sensible defaults.

| Field | Default | Description |
|---|---|---|
| `enabled` | `false` | Master switch — set to `true` to start syncing |
| `baseUrl` | `''` | MAGE server base URL (used for OAuth redirect) |
| `intervalSeconds` | `60` | How often to poll for new observations |
| `startupIntervalSeconds` | `1` | Poll interval immediately after startup (speeds up first sync) |
| `updateIntervalSeconds` | `1` | Poll interval when pending updates exist |
| `batchSize` | `100` | Max observations processed per poll cycle per event |
| `attachmentModifiedTolerance` | `5000` | Milliseconds of tolerance when comparing attachment vs observation modified times |
| `textFieldLength` | `100` | Default ArcGIS field length for MAGE text fields |
| `textAreaFieldLength` | `256` | Default ArcGIS field length for MAGE text areas |
| `observationIdField` | `'description'` | ArcGIS attribute that stores the MAGE observation ID |
| `idSeparator` | `'-'` | Separator between observation ID and event ID |
| `eventIdField` | `'event_id'` | ArcGIS attribute for the MAGE event ID |
| `eventNameField` | `'event_name'` | ArcGIS attribute for the MAGE event name |
| `lastModifiedField` | `'last_modified'` | ArcGIS attribute for the MAGE observation's last modified time |
| `userIdField` | `'user_id'` | ArcGIS attribute for the MAGE user ID |
| `usernameField` | `'username'` | ArcGIS attribute for the MAGE username |
| `userDisplayNameField` | `'user_display_name'` | ArcGIS attribute for the user's display name |
| `deviceIdField` | `'device_id'` | ArcGIS attribute for the submitting device ID |
| `createdAtField` | `'created_at'` | ArcGIS attribute for observation creation time |
| `geometryType` | `'geometry_type'` | ArcGIS attribute storing the Esri geometry type string |
| `fieldAttributes` | `{}` | Override mappings: `{ event: { form: { field: attribute } } }` |
| `attributes` | see below | Per-attribute configuration (concatenation, mappings, defaults, omit) |

### Feature service / layer config

Each entry in `featureServices` maps an ArcGIS Feature Service URL to one or more layers, and each layer maps to one or more MAGE event IDs:

```
featureServices
  └── FeatureServiceConfig
        ├── url           — ArcGIS Feature Service URL
        ├── portalUrl     — ArcGIS portal URL (optional, inferred from url if omitted)
        ├── identityManager — serialized ArcGIS identity (managed automatically)
        └── layers
              └── FeatureLayerConfig
                    ├── layer     — layer name or numeric layer ID
                    ├── geometryType — Esri geometry type for new layers
                    └── eventIds  — MAGE event IDs that sync to this layer
```

### Attribute configuration

The `attributes` map lets you customize how specific ArcGIS attributes are populated:

```json
{
  "attributes": {
    "symbolid": {
      "defaults": [
        { "value": 3, "condition": [{ "attribute": "geometry_type", "values": ["esriGeometryPolyline"] }] },
        { "value": 1, "condition": [{ "attribute": "geometry_type", "values": ["esriGeometryPolygon"] }] }
      ]
    },
    "some_field": {
      "mappings": { "mage_value": "arc_value" },
      "omit": false
    },
    "combined_field": {
      "concatenation": { "delimiter": ", ", "sameForms": true, "differentForms": false }
    }
  }
}
```

## REST API

All protected routes require the `UPDATE_SETTINGS` permission.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/oauth/signin` | public | Initiates OAuth flow for a feature service |
| `GET` | `/oauth/authenticate` | public | OAuth redirect callback |
| `GET` | `/config` | protected | Returns current plugin config (identity tokens stripped) |
| `PUT` | `/config` | protected | Updates config and restarts the processor |
| `POST` | `/featureService/validate` | protected | Validates credentials for a feature service (token or username/password) |
| `GET` | `/featureService/layers` | protected | Lists layers available on a configured feature service |

Base path: `/plugins/@ngageoint/mage.arcgis.service`

---

## Build ArcGIS plugin
- After completing the web-app package install and build in the 'Building from source' section:

```bash
cd plugins/arcgis/service
npm ci
npm link ../../../service # **IMPORTANT** see root README
npm run build
```
```bash
cd plugins/arcgis/web-app
npm ci
npm link ../../../web-app # **IMPORTANT** see root README
npm run build
```

- Continue to install dependencies in the `instance` package as instructed in the root README.

---

## Setting up OAuth for Feature Layers

### [ArcGIS](https://arcgis.geointnext.com/arcgis/home/content.html) Website
- *Content* -> *New Item (button)* -> *Developer Credentials*
  + *Redirect URLs*
    - `https://{mage-server-url}/plugins/@ngageoint/mage.arcgis.service/oauth/authenticate`
      + Mage Server URL example: `magedevd.geointnext.com`
  + *Application Environment*: can be left as *Multiple*
  + *URL*: optional
- After creating the new OAuth *app*/credentials
  + Write down ***Client ID***
- *Content* -> any *Feature Layer*
  + Write down ***URL*** (bottom-right)

### Mage ***Admin*** (shield icon)
- ArcGIS *tab* -> *Feature Layers* -> *Add Feature Service*
  + *URL*: copied from *Feature Layer* above
  + *Authentication*: *OAuth*
    - *Client Id*: copied from *OAuth Client Id* above
  + Click *Create Feature*
- You will know it works if it redirects:
  + *Request for Permission* pop-up with the new OAuth you just created.
  + click *Allow* -> it will redirect *back* to the Mage server