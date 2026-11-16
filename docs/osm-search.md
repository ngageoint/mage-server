# OpenStreetMap search on the web map

## User workflow

1. Select an event, choose the visible map or a drawn search area, and use **Search OpenStreetMap**
   beside the map's filter control.
2. Search by name words, a literal OSM tag (`amenity=hospital`), or tag presence
   (`building=*`). Quick choices include hospital, school, cafe, pharmacy,
   restaurant, fire_station, police, drinking_water and supermarket.
3. Review the features on the map. All/None and individual checkboxes control
   which features are exported. Clicking a result zooms to its geometry.
4. **CSV**, **KML** and **GPKG** export the selection. Users with `CREATE_LAYER` can
   instead name and save it through the ordinary layer upload route. Once
   processing finishes, the dialog adds it to the selected event using the
   existing event-update authorization. An event participant with layer-read
   access can then load it through Mage's normal event layers.

Layer creation does not grant event-update permission. If sharing is denied,
the file remains in the Layers administration screen; an authorized event
manager can add it. **Retry sharing** reuses that saved layer and never uploads
another copy. Processing is checked for at most two minutes before offering a
retry. Closing the dialog removes the temporary preview, not a saved layer.

The data is a snapshot, not a live feed or an offline basemap. OpenStreetMap
coverage and completeness vary. Features crossing the visible bounds retain
their complete geometry; they are not clipped to the screen. Incomplete,
unsupported nested, or malformed relation geometry is skipped and counted.
Routes are multilines; multipolygons preserve assembled outer rings and holes.

## Operator configuration and privacy

`MAGE_OVERPASS_URL` selects an administrator-controlled HTTPS interpreter
endpoint. Without an override, the public providers are
`https://overpass-api.de/api/interpreter` and
`https://overpass.private.coffee/api/interpreter`, with bounded failover/retry.
An explicitly configured provider is retried only at that endpoint; private
queries never fall back to a different public provider. Credentials in URLs and
redirects are rejected. Neither endpoint URLs nor raw Overpass query text are
accepted from browser requests.

Requests identify the application as
`MAGE-OSM-Search (+https://github.com/ngageoint/mage-server)`. Public providers
may reject generic HTTP clients. This identification contains no usernames,
event names, credentials or installation identifiers. An HTTP 504 from a
provider gateway is reported separately from a query execution timeout: it is
not proof that the selected area is too large.

**The chosen Overpass operator receives the search tags/name and geographic
extent.** Do not search sensitive areas through a public endpoint if your
deployment policy forbids this disclosure; configure a trusted private instance
instead. Query text and results are not written to the application database by
the search service. Saving a layer intentionally persists the selected results.

Public instances can reject or time out requests. The UI reports this rather
than claiming success or showing an endless spinner. A public endpoint's
availability is not a guarantee made by Mage.

## Restricted-network and `.mil` deployments

This feature queries **Overpass feature data**, not raster basemap tiles, and
does not create a MAGE Feed. The existing OpenStreetMap basemap configuration is
unchanged. A `.mil` OSM tile server is not automatically an Overpass interpreter.
The restricted deployment must provide a compatible interpreter endpoint,
network access and an approved authentication/TLS policy before this feature can
be considered compatible.

The public defaults above are a proposed deployment policy for maintainer
review, not a requirement to send restricted searches to public infrastructure.
For restricted use, explicitly configure an approved internal endpoint.
Queries using that override never fall back to the public defaults. If policy
forbids public queries and no approved interpreter is available, do not enable
outbound access to these public services.

No `.mil` endpoint, CAC/PKI integration or restricted-network authorization has
been supplied or tested. This implementation does not forward MAGE bearer
tokens, browser cookies or user credentials to the interpreter, and does not
add an authenticated-provider adapter. Server-side credentials in interpreter
URLs are rejected. A restricted endpoint requiring additional authentication
will need a separately reviewed provider integration. Keep certificate
verification enabled.

The maintainer team should decide whether the upstream default should use the
public providers, require explicit configuration, or use an approved internal
provider. Do not assume equivalence between public OSM and the team's `.mil`
service, including coverage, update frequency, tags, licensing and access rules.

## Bounds and authorization

- Existing bearer authentication and `READ_LAYER_ALL` or `READ_LAYER_EVENT`
  permission protect both `POST /api/osm/search` and `POST /api/osm/export`.
- Inputs are finite numeric WGS84 bounds, ordered south/west/north/east.
  Latitude is restricted to ±85°, with no date-line crossings.
- The extent must be no wider/taller than 5° and no larger than approximately
  100,000 km². Drawn rectangles, circles and polygons can narrow that extent.
  Coordinates are never rounded or used as a broad cache bucket.
- Server-constructed queries have a 20-second Overpass execution limit,
  8 MiB Overpass memory allowance, 22-second response / 25-second total network
  deadlines and a 6 MiB HTTP response ceiling. Result overflow is rejected,
  not silently truncated: at most 500 objects and 30,000 geometry coordinates.
- Five-second per-user search spacing, two concurrent upstream searches,
  one concurrent GeoPackage generation, and twenty cached result sets bound
  work in each process. The throttle remembers at most 1,000 active users.
- Exact search results are cached per authenticated user for up to ten minutes,
  with least-recently-used eviction when the twenty-entry capacity is reached.
  Cache capacity never blocks a new search; an evicted selection returns the
  same clear search-again response as an expired selection.
  Export accepts only unique result IDs from that user's unexpired search.
  Another process, restart, or cache expiry requires searching again.
- These are per-process limits; operators running multiple replicas should
  also set gateway-wide request limits.

GeoPackages use the existing `@ngageoint/geopackage` dependency, EPSG:4326,
one mixed-geometry `osm_features` table, computed content extents, and textual
OSM identity, tags, source URL and attribution. Temporary generation files are
removed on both success and failure. Stored files follow Mage's current layer
validation, storage, indexing and tile-rendering paths. No parallel storage or
mobile API format is introduced.

## Attribution and upstream review

Preview, exported rows, GeoPackage content description and saved layer
description retain **© OpenStreetMap contributors**, **ODbL 1.0** and
<https://www.openstreetmap.org/copyright>. Distributing modified OSM-derived
databases may carry further ODbL obligations; preserve this attribution when
redistributing files. Imported GeoPackage popup values are displayed as text,
never evaluated as HTML.

This change is self-contained in the Mage server/web repository. It adds no
dependencies, changes no lockfiles, uses conventional NgModule components and
RxJS, and does not require the local Angular migration's new APIs. The map and
HomeModule insertions are small integration points to reapply on upstream
develop. Existing native clients and their basemap defaults are unchanged.

## Verification

Run from the Mage repository:

```sh
npm run build --prefix service
# Focused tests read the source utilities and the compiled route/permissions:
cd service && npx mocha --no-config 'test/osm/*.js' && cd ..
npm run ci:test --prefix service
# Includes cleanup of the isolated functional-test database, never the live DB:
npm run functionalTests --prefix service
npm run build --prefix web-app
CHROME_BIN=/path/to/chromium npm run test-headless --prefix web-app -- \
  --include='src/app/map/osm/*.spec.ts'
```

Focused server tests cover exact bounds, limits, query injection, throttling,
cache ownership/expiry, empty/failing upstream responses, geometry conversion,
GeoPackage validation and tile rendering. Authenticated functional tests cover
real bearer protection, denied upload/event updates, ordinary multipart upload,
processing, participant/nonparticipant visibility, file download and tile PNGs.
Web tests cover request contracts, validation, selections, safe popups, expiry,
processing readiness, map cleanup and sharing retry without duplicate uploads.

Public Overpass connectivity must also be checked from the target deployment.
The workspace verification encountered an HTTP 406 from the default public
endpoint and a timeout from another public operator; fixture-based correctness
checks do not claim that those external services are available.
