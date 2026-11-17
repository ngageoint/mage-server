# Source-linked guide screen captures

The guide uses the **real compiled Angular application**, not a second HTML/SVG
implementation of its screens. Named scenes cover the map, observation
editor, filters, user list/create/details, event forms, form details
and fields, all eleven field-type configuration dialogs, map symbology, layer
list/create and feed list/create. The plugin picture remains
an explicitly labelled workflow diagram: third-party plugins supply their own
interfaces, so a universal plugin settings screenshot would be misleading.

## Updating pictures

Run `npm run guides:capture` in `web-app`. If application source has changed,
this builds the real app and captures all registered scenes with Chromium.
`CHROME_BIN` can select the local Chromium executable. Normal development and
production **npm build commands also run this check/refresh automatically**.
Guide-only text changes do not require another capture.

The capture scripts discover installed Chrome/Chromium on PATH (and common
Windows/macOS installation locations), or use an explicit `CHROME_BIN` path.
There is no Replit-specific browser path, browser service or automatic download.
Use the Node version supported by this checkout's Angular CLI, install locked
dependencies with `npm ci`, and build the core library with
`npm run build:core-lib` before a first app capture. The developer host needs
Chrome/Chromium; the installed MAGE server does not. Capture uses Node's built-in
HTTP, fetch and WebSocket support and the compiled app's normal dependencies.

Then run `npm run guides:generate` and review changed instructions before
`npm run guides:review`. `npm run guides:check` verifies both capture freshness
and editorial review. A review command cannot override stale captures.
`guides:review` acknowledges **all current topics**, so inspect every changed
topic and picture before running it. Do not acknowledge unrelated unreviewed
workflow changes merely to make a build pass.

## AI independence and maintenance contract

The production guide, compiler, screenshot refresh, checks, administrator
customization and offline exports do not call an AI provider or require an AI
account, prompts, credentials or Replit services. Developers may use AI here in
Replit to accelerate edits, but the deliverable is ordinary reviewed source
that core MAGE maintainers can edit and regenerate without AI.

- Authored instructions, control links, image placements and topic source
  dependencies live in `docs/user-guides.json`.
- Stable template `data-guide` markers resolve current labels/tooltips and
  icons. Renaming a label updates its linked instructions; removing a marker
  requires updating the reference rather than keeping stale text.
- Application changes invalidate registered captures. New views, dialogs,
  role variants and workflows require explicit scene/fixture coverage and
  authored instructions, not inferred prose.
- `guides:watch` regenerates content, but does not build the app or refresh
  stale captures. Run `guides:capture` when it reports stale screenshots.
- Generated defaults and persisted administrator overrides are separate.
  Regeneration does not overwrite custom text, visibility or uploaded image
  placements. Those manual overrides still require manual maintenance.
- Offline editions embed pictures and saved customizations; download again
  after updates.

Run `npm run guides:test` for deterministic compiler, freshness, portability
and isolated-fixture tests. The portability tests run relocated scripts with an
empty environment and exercise generation with network access blocked. The
About MAGE developer disclosure documents this contract in the application.
Actual screen refresh still needs the explicitly allowed public fonts and OSM
tiles; non-AI does not mean zero-network.

The capture manifest binds each PNG to a hash of the application templates,
styles, TypeScript, shared library, dependencies and capture fixtures/scenarios.
Changed source requires new captures. Missing or altered PNGs fail validation.
Images are embedded in both in-app help and the self-contained offline edition.

Production Docker builds need no Chromium when they contain current committed
captures. A source change without refreshed captures fails with a clear error
instead of silently shipping old pictures. Run the refresh in a developer
checkout before packaging.

## Privacy and isolation

The temporary capture server binds only to an ephemeral loopback port, serves
the compiled app and responds only with hard-coded fictional API fixtures.
It never forwards requests to a running MAGE server or opens a database.
Unknown API requests fail capture. Mutating requests are refused. Each browser
uses a disposable clean profile and a fictional session value, never credentials.
External traffic is blocked except the same public Google font hosts already
used by MAGE and `tile.openstreetmap.org`. Every pictured map uses MAGE's actual
OpenStreetMap layer over a fixed documentation area, never an operational map
position. OSM tiles must finish loading or capture fails. No Overpass queries or
geolocation requests are made. OSM attribution is visible in the captures, and
the captured map pixels are embedded for offline guide viewing.

The public OSM tile host is documentation-fixture configuration, not a change
to the deployment's configured imagery or an additional production feed.
Sites using restricted or private OSM services can retain the packaged pictures
without capture-network access. Refreshing against an approved training tile
source requires changing the fixture URL and the capture allowlist together;
never substitute operational locations, real records or credentials. The
separate OSM search/export contribution is not required by this guide feature.

## Coverage and limits

`scripts/guide-scenes.cjs` is an explicit inventory of captured **guide views**,
including navigation steps and expected real components/text. Add a scene
whenever a guide introduces another view, dialog or role-specific variation.
A missing control, failed fixture or wrong screen fails the refresh.

This is not a claim that every possible app state, plugin, role, validation
error or workflow has been exercised. New screens need a scenario and fictional
fixtures; the tool cannot invent the intended workflow safely. Application
source changes trigger screen regeneration, while workflow explanations still
require human review. Captures reflect the source being built, not an unrelated
older Windows installation or an unbuilt change in an editor.
