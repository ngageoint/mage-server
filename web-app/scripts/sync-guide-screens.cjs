#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { sourceFingerprint } = require('./capture-guide-screens.cjs');
const { findGuideBrowser } = require('./guide-browser.cjs');
const root = path.resolve(__dirname, '..');
function captureStatus(base = root) {
  const manifestFile = path.join(base, 'docs/guide-captures.json');
  if (!fs.existsSync(manifestFile)) return 'Guide screenshots have not been captured.';
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest.referenceOnly) return 'Guide screenshots are reference-only; refresh against this checkout before publishing.';
  if (manifest.sourceFingerprint !== sourceFingerprint(base)) return 'Application source changed since guide screenshots were captured.';
  const { scenes } = require('./guide-scenes.cjs');
  const crypto = require('node:crypto');
  for (const scene of scenes) {
    const image = manifest.screens.find(screen => screen.id === scene.id);
    if (!image || image.file !== `docs/images/${scene.id}.png`) return `Missing capture: ${scene.id}`;
    const file = path.join(base, image.file);
    if (!fs.existsSync(file) || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== image.sha256) {
      return `Missing or changed capture image: ${scene.id}`;
    }
  }
  return null;
}
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit',
    env: { ...process.env, NG_BUILD_MAX_WORKERS: process.env.NG_BUILD_MAX_WORKERS || '1',
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Guide screenshot refresh failed (${command}, exit ${result.status}).`);
}
if (require.main === module) {
  try {
    const stale = captureStatus();
    if (stale) {
      if (process.argv.includes('--check')) throw new Error(stale);
      try { findGuideBrowser(); }
      catch (error) { throw new Error(`${stale} ${error.message} Refresh in a developer checkout, then package the updated captures.`); }
      // Direct CLI avoids recursively invoking the npm prebuild hook.
      run(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build', '--project=app', '--configuration=production']);
      run(process.execPath, ['scripts/capture-guide-screens.cjs']);
    }
    console.log('Guide screen captures match the application source.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { captureStatus };
