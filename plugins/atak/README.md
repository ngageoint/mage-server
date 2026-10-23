# ATAK Feed Mage Plugin

A Mage server plugin that connects a Mage event to a TAK Server in both
directions: TAK Server data appears in Mage as a live Feed, and Mage
observations and user locations can be pushed out to the TAK Server as
Cursor-on-Target (CoT) events. The feed side follows the same
`FeedsPluginHooks` extension point as `plugins/nga-msi`.

## Status

Implemented. A single `TakServerServiceType` connects to a TAK Server's
Marti API for the feed side, and the same connection's CoT port is used to
push Mage data out. Both a real Gov TAK Server and an OpenTAKServer
instance (via its Marti-compatibility layer) speak the same API, so one
service type covers both.

### Service configuration

| Field | Required | Description |
|-------|----------|--------------|
| `baseUrl` | Yes | GovTAK or OpenTAK Server base URL |
| `port` | No | Server port |
| `cotPort` | No | TCP port for sending Mage data to the TAK server. Required for the push features below - without it, sharing is enabled but nothing is actually sent. |
| `username` | No | Server username |
| `password` | No | Server password |

### Pulling TAK data into Mage

- **ATAK CoT Events** (`cot-events`) - live unit positions and points of
  interest. Since the Marti API has no single bulk "every device's current
  position" endpoint, this topic discovers the connected device roster via
  `/Marti/api/clientEndPoints`, then fetches each device's position
  individually via `/Marti/api/cot/xml/<uid>`, merging the results into one
  feed update. A device whose position fetch fails or can't be parsed is
  skipped rather than failing the whole update.

### Pushing Mage data to TAK

Each Mage event has two independent sharing toggles, available from the
plugin's admin page:

- **Share observations to TAK** - while enabled, the plugin periodically
  checks the event for new or edited observations and sends each one to the
  TAK server as a CoT marker. Editing an already-pushed observation updates
  the same marker instead of creating a duplicate.
- **Share user locations to TAK** - while enabled, a Mage user's reported
  location is sent to the TAK server as a live position report as soon as
  it's saved.

Both toggles default to off and are independent - enabling one does not
enable the other, since a continuous location feed is a bigger privacy
footprint than a deliberately-submitted observation.

## Background

ATAK's native data format is CoT (Cursor-on-Target, XML) - position reports
and events broadcast by ATAK clients. ATAK devices don't expose an API
directly; a TAK Server aggregates their CoT traffic and exposes it over its
Marti REST API, which is what this plugin's feed side connects to. Pushing
data back out uses the TAK Server's CoT TCP ingest port directly, since CoT
write support isn't available through the Marti REST API.
