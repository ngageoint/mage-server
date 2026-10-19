# ATAK Feed Mage Plugin

A Mage server plugin that surfaces live ATAK/TAK Server data as a Mage Feed,
following the same `FeedsPluginHooks` extension point as `plugins/nga-msi`.

## Status

Implemented. A single `TakServerServiceType` connects to a TAK Server's
Marti API - both a real Gov TAK Server and an OpenTAKServer instance (via
its Marti-compatibility layer) speak the same API, so one service type
covers both.

### Service configuration

| Field | Required | Description |
|-------|----------|--------------|
| `baseUrl` | Yes | GovTAK or OpenTAK Server base URL |
| `port` | No | Server port
| `username` | No | Server username |
| `password` | No | Server password |

### Topics

- **ATAK CoT Events** (`cot-events`) - live unit positions and points of
  interest. Since the Marti API has no single bulk "every device's current
  position" endpoint, this topic discovers the connected device roster via
  `/Marti/api/clientEndPoints`, then fetches each device's position
  individually via `/Marti/api/cot/xml/<uid>`, merging the results into one
  feed update. A device whose position fetch fails or can't be parsed is
  skipped rather than failing the whole update.

## Background

ATAK's native data format is CoT (Cursor-on-Target, XML) - position reports
and events broadcast by ATAK clients. ATAK devices don't expose an API
directly; a TAK Server aggregates their CoT traffic and exposes it over its
Marti REST API, which is what this plugin connects to.
