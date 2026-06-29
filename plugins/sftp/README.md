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

## Getting the Plugin Running (Docker)

This section covers everything needed to run the SFTP plugin locally using Docker Compose. A local `atmoz/sftp` container is included for development so you can test without a real remote server.

### 1. Generate an RSA key pair

The plugin currently authenticates to the SFTP server using an RSA private key. Password authentication is not yet supported (Kubernetes secret support is planned for a future release).

Create the `sftp-test/` directory at the repo root and generate a key pair there:

```bash
mkdir -p sftp-test/upload
ssh-keygen -t rsa -b 4096 -f sftp-test/id_rsa -N ""
```

This produces two files:
- `sftp-test/id_rsa` — private key, mounted into the MAGE server container
- `sftp-test/id_rsa.pub` — public key, mounted into the SFTP server container

> **Do not commit these files.** `sftp-test/` should be in `.gitignore`.

### 2. Verify `docker-compose.yml` has the SFTP lines active

The following lines in `docker-compose.yml` must be present and uncommented.

**Under `mage-server` → `volumes`** (line 30):
```yaml
- ./sftp-test/id_rsa:/run/secrets/sftp_key:ro
```

**Under `mage-server` → `environment`** (lines 44–46):
```yaml
SFTP_PLUGIN_CONFIG_SALT: "A0E6D3B4-25BD-4DD6-BBC9-B367931966AB"
MAGE_SFTP_KEY_FILE: /run/secrets/sftp_key
MAGE_PLUGINS: '{"servicePlugins":["@ngageoint/mage.sftp.service",...],"webUIPlugins":["@ngageoint/mage.sftp.web",...]}'
```

> Change `SFTP_PLUGIN_CONFIG_SALT` to a unique UUID before any non-local deployment. Do **not** rotate it after deployment — it is used to encrypt stored config and changing it will break existing settings.

**The `mage-sftp` service block** (lines 79–88) — the local SFTP server for development:
```yaml
mage-sftp:
  image: atmoz/sftp
  command: magetest::1001
  volumes:
    - ./sftp-test/id_rsa.pub:/home/magetest/.ssh/keys/id_rsa.pub:ro
    - ./sftp-test/upload:/home/magetest/upload
  ports:
    - "2222:22"
  networks:
    - mage.net
```

Uploaded zip archives will appear in `sftp-test/upload/` on your host machine.

### 3. Verify the Dockerfile has the SFTP build stages active

The SFTP plugin has two build stages in the `Dockerfile` that must be present and uncommented — one for the service plugin and one for the web UI plugin:

```dockerfile
FROM node:20.11.1 AS build-sftpserviceplugin
...
FROM node:20.11.1 AS build-sftpwebplugin
...
```

Both stages should already be present. Check that the corresponding `COPY` and `RUN npm install` lines in the `build-instance` stage are also active.

### 4. Build and start

```bash
docker compose up --build -d
```

This starts three containers: `mage-db`, `mage-server`, and `mage-sftp`.

### 5. Upload the private key and configure in the admin UI

1. Open `mage` and log in
2. Navigate to **Admin → Menu → SFTP**
3. Under **SFTP Client Options**, upload the private key (`sftp-test/id_rsa`)
4. Fill in the connection details for the local test server:
   - **Host**: `mage-sftp`
   - **Port**: `22`
   - **Username**: `magetest`
   - **Path**: `/upload`
5. Click **Test Connection** to verify
6. Toggle **Enabled** to `true` and save

> The remote path (`/upload` in this example) must already exist on the SFTP server. The plugin will not create it automatically.

### Connecting to a real SFTP server

Replace the `mage-sftp` connection details with your server's host, port, username, and the remote directory path. Generate or obtain a key pair accepted by that server and upload the private key via the admin UI. The public key must be added to the server's `authorized_keys` (or equivalent) for the configured user.

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
