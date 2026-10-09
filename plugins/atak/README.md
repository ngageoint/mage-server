# ATAK Feed Mage Plugin

A Mage server plugin that surfaces ATAK data as a Mage Feed, following the same
`FeedsPluginHooks` extension point as `plugins/nga-msi`.

## Status

Scaffold only — package structure exists, no feed logic yet. Blocked on
identifying a concrete ATAK/CoT data source to fetch from (see
`mage-notes/TRACKING.md`, 2026-09-25 entry, for the full scoping notes).

## Background

ATAK's native data format is CoT (Cursor-on-Target, XML) - position reports
and events broadcast by ATAK clients. It isn't a static API by itself, so
this plugin needs a concrete source to poll or subscribe to, such as:

- A TAK Server's Marti REST API (the standard production path; requires
  mutual-TLS client certs)
- FreeTAKServer, an open-source community TAK Server (simpler to stand up
  for a first prototype)

## Links

- Cursor-on-Target (CoT) message format: https://www.mitre.org/sites/default/files/pdf/09_4937.pdf
- TAK Server: https://tak.gov
- FreeTAKServer: https://github.com/FreeTAKTeam/FreeTakServer
