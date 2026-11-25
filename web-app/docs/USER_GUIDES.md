# Source-linked MAGE user guides

The `/help` reader and its offline HTML downloads use the same generated
document. Its generated public source contains no real user, event, credential
or observation data. An authenticated reader can separately select an event to
generate guidance from its authorized form definitions; that content is private
to readers of that event and may be included in their offline download.
All six topics are available as reference material, with audience/permission
notes; this does not grant permission to perform administrative actions.

## How updates work

All guide generation is deterministic code. It makes no AI calls. Application
builds refresh source-linked control labels, icons and actual-screen captures;
runtime event guidance is generated from authorized current form definitions,
not observations, member names, saved values or password defaults.

## Administrator customization

From About MAGE, open the guide in a new tab. Administrators with
`UPDATE_SETTINGS` can choose **Customize guide** to include/exclude topics and
sections and edit titles, paragraphs and numbered steps. Select an authorized
event and choose **Customize event forms** to include/exclude its individual
form fields and edit their instructions. Visibility is documentation-only:
it never changes forms, permissions or observation validation.

Manual overrides live in MongoDB settings, not generated source. They survive
builds and normal database backups. The global settings scope is publicly
readable and must contain no private information. Event settings have separate
keys and enforce the same event-read permission as the event itself.
Writes require the administrator role and `UPDATE_SETTINGS`, with revision
checks to reject conflicting saves. Readers see saved customizations in search,
screen content, print and offline exports. Protect event-specific downloads.

Cancel discards a draft. Per-item reset restores automatic text while retaining
visibility. Reset-all needs confirmation and a subsequent Save. New generated
items default to included; unknown/orphaned override keys are retained until an
administrator removes them. Manual text is kept and flagged if its generated
source changes. Explicit section `id` values stay fixed when renaming a section;
legacy sections use a slug of their original title—retain that slug as an
explicit `id` before renaming to preserve the association.

Event definitions refresh once per minute while a reader is not editing.
Automatic refresh pauses during editing so it cannot overwrite a draft.
This does not infer undocumented workflows or third-party plugin instructions:
those remain human-authored/reviewed, without AI.

## Source-linked content

- `user-guides.json` holds reviewed explanations, workflow-source dependencies
  and stable references to real UI controls.
- `data-guide` markers identify actual buttons. Separate `data-guide-label`
  and `data-guide-icon` markers handle a control with a more complex template.
  The compiler extracts current labels/tooltips and icon names; instructions
  use `{{control:ID}}`, not another hard-coded copy of the button label.
- Building the app regenerates the reader content. `npm start` also watches
  source/content changes and regenerates during development.
- Each topic fingerprints its documented source dependencies and instructions.
  Changes after the last explicit review flag affected topics internally and
  fail the maintainer check. Source-review warnings and file lists are not shown
  in the ordinary reader or downloaded guide.
- Workflow explanations are not invented or silently rewritten from code.
  A developer must inspect the change, amend affected instructions, verify the
  workflow, and acknowledge the review. This is intentionally conservative.
- Removing/duplicating a referenced control or workflow source fails generation.
  A new feature is not automatically documented: add its sources and instructions.

```sh
npm run guides:generate  # regenerate labels, icons, review flags and edition
npm run guides:capture   # rebuild real UI screenshots when tracked source changes
npm run guides:check     # fails for stale output OR unreviewed workflow changes
npm run guides:test      # compiler/source-change regression tests
npm run guides:review    # ONLY after manually reviewing affected instructions
```

`guides:review` records `user-guides.reviewed.json`; normal generation/builds
never acknowledge review automatically. Commit content, review metadata and
`src/app/help/generated-guide.ts` together. The CI test script includes the guide
check. The browser reader uses the current installed build: updating source on
another machine does not change an already installed Windows image.

Downloaded HTML is self-contained and works without a server, web fonts or
network access. Use browser Print / Save as PDF for a PDF copy. A downloaded file
is an immutable edition, not a live connection: download again after installing a
new MAGE build. Offline guides do not make imagery, feeds or web uploads work
offline.

## Code locations

| Concern | Location |
| --- | --- |
| Reader route | `src/app/routing.module.ts`, `/help` |
| Entry point | About MAGE, Help, Open user guide (new tab) |
| Reader, search and export | `src/app/help/help.component.*`, `guide-export.ts` |
| Admin editor and image placement | `src/app/help/guide-editor.component.*` |
| Automatic event-form guidance and saved overlays | `src/app/help/guide-customization.ts` |
| API client | `src/app/help/guide-customization.service.ts` |
| Cross-tab sign-in/out synchronization | `src/app/http/session.service.ts`, called by the guide |
| Authored six-topic source | `docs/user-guides.json` |
| Compiler and tests | `scripts/generate-user-guides*.cjs` |
| Capture scenarios and fictional records | `scripts/guide-scenes.cjs`, `guide-capture-fixtures.cjs` |
| Capture isolation and refresh | `scripts/capture-guide-screens.cjs`, `sync-guide-screens.cjs` |
| Review metadata / generated edition | `docs/user-guides.reviewed.json`, `src/app/help/generated-guide.ts` |
| HTTP routes | `../service/src/routes/user-guide.js` |
| Settings validation / revision checks | `../service/src/models/guide-customization.js` |
| Rasterized screenshot storage | `../service/src/models/guide-images.js` |
| API authorization and concurrency tests | `../service/test/guide-customization.test.cjs` |

The existing service route loader discovers the new route module; no separate
server or service registration is required. Settings use the existing MongoDB
settings model. Image bytes live under the configured MAGE attachment/resource
directory's `user-guide-images` folder; include this directory and settings in
the normal backup policy. No database replacement, new AI provider, browser
driver dependency or hosted documentation service is introduced.

For administrator text/image editing instructions, see
[Customize guide content](ADMIN_USER_GUIDES.md). For developer capture commands,
network requirements and coverage limitations, see
[Source-linked guide screen captures](guide-screen-capture.md).

## API and security contract

- `GET /api/user-guide/customizations`: public global defaults/overrides.
- `PUT /api/user-guide/customizations`: authenticated `ADMIN_ROLE` or
  `EVENT_MANAGER_ROLE` with `UPDATE_SETTINGS`.
- `GET /api/user-guide/events/:guideEventId`: authenticated event-read access.
- `PUT /api/user-guide/events/:guideEventId`: settings-write role/permission
  above plus event-read access.
- `POST .../images`: same authorization as that scope's settings writes.
- `GET .../images/:imageId`: only images referenced by published settings;
  event-scoped images also require event-read access.

Writes carry the previously read revision. A concurrent edit returns a conflict
instead of overwriting another administrator. Source images accept bounded
PNG/JPEG/WebP only, are decoded and rasterized to PNG, and are served without
HTML/SVG execution. Text is plain text and escaped in offline HTML. These are
not redaction tools: use fictional records in screenshots before uploading.

Do not put credentials, user records or operational observations into public
global content. Offline event-specific files remain private material and are
not automatically revoked when someone loses server access.

## Integration scope

This contribution targets core MAGE, independently of the separate OSM
search/export contribution. It does not introduce Overpass, local AI drafting,
Windows deployment helpers, framework upgrades or Replit configuration.
Downstream features can add their own reviewed guide topics, control markers
and capture scenarios without changing the guide architecture.
