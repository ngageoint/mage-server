#!/usr/bin/env node
/* Render the real compiled application with an isolated, fictional API.
 * No real credentials, API proxy or operational database.
 * Only public OSM tiles for a fixed documentation area and app fonts are allowed.
 * Chromium/CDP is used for asset generation; no production capture route exists. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { findGuideBrowser } = require('./guide-browser.cjs');
const { response } = require('./guide-capture-fixtures.cjs');
const root = path.resolve(__dirname, '..');
const { scenes } = require('./guide-scenes.cjs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function sourceFingerprint(base = root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(base, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (!/\.(spec|test)\./.test(rel) && !rel.endsWith('/help/generated-guide.ts') &&
          /\.(ts|html|scss|css|json|svg|png|jpg|woff2?)$/.test(rel)) files.push(rel);
    }
  }
  walk('src'); walk('projects/core-lib');
  for (const name of ['angular.json', 'package-lock.json', 'scripts/guide-scenes.cjs', 'scripts/guide-capture-fixtures.cjs', 'scripts/capture-guide-screens.cjs', 'scripts/guide-browser.cjs']) files.push(name);
  return hash(files.sort().map(file => {
    const bytes = fs.readFileSync(path.join(base, file));
    // Windows Docker normalizes registry URLs before npm ci. This does not
    // change the rendered UI: versions/integrity/dependency configuration do.
    const content = file === 'package-lock.json'
      ? JSON.stringify(JSON.parse(bytes.toString()), (key, value) => key === 'resolved' ? undefined : value)
      : bytes;
    return `${file}\0${hash(content)}`;
  }).join('\n'));
}
async function capture() {
  // Resolve before opening a temporary server; missing browsers must not leave
  // a listening process behind.
  const browser = findGuideBrowser();
  const build = path.join(root, 'dist/app');
  if (!fs.existsSync(path.join(build, 'index.html'))) throw new Error('Build the application before capturing guide screens.');
  const failures = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    // Fictional feed samples use MAGE's shipped marker for their two statuses.
    // Serve real image bytes rather than a JSON response or a broken icon.
    if (['GET', 'HEAD'].includes(req.method) && /^\/api\/events\/1\/icons\/1\/(Open|Closed)$/.test(url.pathname)) {
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(root, 'src/assets/images/default_marker.png')));
      return;
    }
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/plugins')) {
      try {
        const body = response(url, req.method);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      } catch (error) {
        failures.push(error.message);
        res.writeHead(501, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: error.message }));
      }
      return;
    }
    let file = path.resolve(build, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(build + path.sep)) file = path.join(build, 'index.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(build, 'index.html');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
      '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const os = require('node:os');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-guide-capture-'));
  const chrome = spawn(browser, [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  let startupError;
  chrome.on('error', error => { startupError = error; });
  chrome.stderr.on('data', bytes => stderr += bytes.toString());
  let ws;
  try {
    for (let i = 0; i < 100 && !startupError && !/DevTools listening on/.test(stderr); i++) await sleep(100);
    if (startupError) throw new Error('Could not launch the configured guide capture browser.');
    const browserSocket = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    if (!browserSocket) throw new Error('Chromium did not start its capture endpoint.');
    const address = new URL(browserSocket);
    const targets = await (await fetch(`http://${address.host}/json/list`)).json();
    ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    function call(method, params = {}) {
      const request = ++id;
      return new Promise((resolve, reject) => {
        pending.set(request, { resolve, reject });
        ws.send(JSON.stringify({ id: request, method, params }));
      });
    }
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const promise = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) promise.reject(new Error(message.error.message));
        else promise.resolve(message.result);
      }
      if (message.method === 'Fetch.requestPaused') {
        const { requestId, request } = message.params;
        const target = new URL(request.url);
        if (target.origin === origin || ['data:', 'blob:'].includes(target.protocol) ||
            ['fonts.googleapis.com', 'fonts.gstatic.com', 'tile.openstreetmap.org'].includes(target.hostname)) {
          call('Fetch.continueRequest', { requestId }).catch(() => {});
        } else {
          // Never contact Overpass, geolocation, or an arbitrary layer provider.
          call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        }
      }
    };
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + JSON.stringify(result.exceptionDetails.exception));
      return result.result.value;
    };
    await call('Page.enable');
    await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
    await call('Page.addScriptToEvaluateOnNewDocument', { source: `
      localStorage.clear();
      localStorage.setItem('token', 'fictional-documentation-session');
      localStorage.setItem('event', '1');
      localStorage.setItem('mapPosition', JSON.stringify({center:{lat:38.6,lng:-90.2},zoom:10}));
      localStorage.setItem('pollingInterval', '3600000');
    ` });
    const manifest = { sourceFingerprint: sourceFingerprint(), viewport: { width: 1200, height: 800 },
      data: 'Isolated fictional fixtures only; no operational data or credentials', screens: [] };
    for (const scene of scenes) {
      failures.length = 0;
      const viewport = scene.viewport || manifest.viewport;
      await call('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false });
      // A same-hash navigation reuses Angular views. Tear down each page first,
      // so an open editor/dialog from one picture cannot leak into another.
      await call('Page.navigate', { url: 'about:blank' });
      await call('Page.navigate', { url: `${origin}/#${scene.route}` });
      for (let wait = 0; wait < 100; wait++) {
        await sleep(100);
        if (await evaluate(`!!document.querySelector('navigation,admin-users,admin-navbar,mage-admin-navbar') || document.body.innerText.includes('IDENTITY AND ACCESS')`)) break;
      }
      await sleep(1000);
      for (const step of scene.steps || []) {
        await evaluate(step);
        await sleep(650);
      }
      await evaluate('document.fonts.ready');
      if (failures.length) throw new Error(`${scene.id}: ${[...new Set(failures)].join('; ')}`);
      if (scene.expect && !await evaluate(`!!document.querySelector(${JSON.stringify(scene.expect)})`)) {
        throw new Error(`${scene.id}: expected live component ${scene.expect} is missing. ${await evaluate('document.body.innerText.slice(0,1500)')}`);
      }
      if (scene.text && !await evaluate(`document.body.innerText.includes(${JSON.stringify(scene.text)})`)) {
        throw new Error(`${scene.id}: expected screen text ${scene.text} is missing`);
      }
      const hasMap = await evaluate(`!!document.querySelector('.leaflet-container')`);
      if (hasMap) {
        // Capture the actual MAGE OSM layer, never a separately drawn replacement.
        // Wait for tile load and fail rather than publish a blank or partial map.
        let loaded = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          loaded = await evaluate(`(() => {
            const tiles=[...document.querySelectorAll('.leaflet-container img.leaflet-tile')];
            return tiles.length > 0 && tiles.every(img=>img.complete && img.naturalWidth > 0);
          })()`);
          if (loaded) break;
          await sleep(200);
        }
        if (!loaded) throw new Error(scene.id + ': OpenStreetMap tiles did not load completely');
        // MAGE raster-layer attribution is not passed through to Leaflet.
        // Keep the required OSM credit visible in documentation captures.
        await evaluate(`(() => {
          const credit=document.querySelector('.leaflet-control-attribution');
          if(credit && !credit.textContent.includes('OpenStreetMap')) {
            credit.insertAdjacentHTML('beforeend',' | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
          }
        })()`);
      }
      const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const bytes = Buffer.from(shot.data, 'base64');
      const file = `docs/images/${scene.id}.png`;
      fs.writeFileSync(path.join(root, file), bytes);
      manifest.screens.push({ id: scene.id, route: scene.route, file, sha256: hash(bytes) });
      console.log(`Captured ${scene.id} (${bytes.length} bytes)`);
    }
    fs.writeFileSync(path.join(root, 'docs/guide-captures.json'), JSON.stringify(manifest, null, 2) + '\n');
  } finally {
    ws?.close(); chrome.kill('SIGTERM'); server.close();
    // Chromium owns profile locks until exit; remove after it closes.
    await new Promise(resolve => startupError || chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
if (require.main === module) capture().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { sourceFingerprint };
