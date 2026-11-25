# Dynamic guide contribution: draft verification status

This branch ports the dynamic guide feature onto upstream `develop`. It does
not change the upstream Angular version or include the separate OSM
search/export feature, Windows packaging or Replit deployment configuration.

## Verified here

- The guide generator's deterministic behavior, source-marker validation,
  changed-workflow review gate, image validation and portable browser resolver
  passed all 22 isolated Node tests, including rejection of reference-only
  pictures. These fixture tests do not assert that this port's PNGs are current.
- The six service tests passed, including public/global versus event-scoped
  access, privileged writes, screenshot serving and concurrent revision checks.
- The original application checkout, approved baseline and running services
  were not changed by this contribution checkout.

## Why this is a draft

The available application installation used Angular 22, while upstream declares
Angular 20. Reusing it produced unrelated upstream compilation errors, so this
is **not** claimed as a valid Angular 20 build or UI-test pass.

A separate installation of the declared Angular 20 dependency ranges was
attempted. Replit's package firewall rejected:

```text
ERR_PNPM_FETCH_403 GET
http://package-firewall.replit.internal/npm/piscina/-/piscina-5.2.0.tgz
Forbidden - 403
dependency of @angular-devkit/build-angular@20.3.31
```

No firewall bypass, alternate download or framework upgrade was attempted.
The new guide/session API mismatches visible in the attempted compile were
corrected, but a successful build with the declared upstream toolchain remains
unverified.

## Pictures must be refreshed before merge

The included PNGs are actual UI captures with fictional records from the local
integration, not a claim of fresh Angular 20/upstream captures. Their manifest
retains the **original** source fingerprint and sets `referenceOnly: true`.
Its source fingerprint intentionally does not match this port. Capture checking
and the production prebuild gate must reject it until real refresh succeeds;
do not rewrite hashes to make these reference images appear current.

Consequently `guides:captures:check`, real-document generation and the production
prebuild gate intentionally fail. This is a known merge blocker, not a passing
visual-verification claim. The isolated unit suite can pass independently.

## Before marking ready for review or merging

Use a supported Node runtime and the normal upstream dependency installation
outside the blocked environment, without changing the declared dependencies.
From `web-app`:

```sh
npm ci
npm run build:core-lib
npm run guides:capture
npm run guides:generate
npm run guides:test
npm run guides:captures:check
# Review all six chapters and new PNGs; only then acknowledge:
npm run guides:review
npm run guides:check
npm run ci:test
npm run build:prod
```

`guides:capture` builds the compiled app directly and uses fictional API
fixtures; it does not need access to a live MAGE database. A Chromium browser
and the explicitly allowed fonts/OSM training tiles are needed for refresh.
The captured manifest replaces the reference-only metadata.

Also run `node --test test/guide-customization.test.cjs` from `service`.
Verify a real signed-in administrator can save global/event guide edits and
screenshots, a normal reader cannot edit, and the new-tab guide responds to
sign-out in another tab. Verify chapter/full HTML downloads contain the same
saved text and pictures. These native-toolchain UI checks are still pending.
