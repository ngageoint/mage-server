const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { compile, generate } = require('./generate-user-guides.cjs');

test('reference-only pictures cannot be marked publishable by changing their source hash', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-guide-reference-'));
  try {
    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/guide-captures.json'),
      JSON.stringify({ referenceOnly: true, sourceFingerprint: 'not-current', screens: [] }));
    assert.match(require('./sync-guide-screens.cjs').captureStatus(root), /reference-only/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('advanced form guide covers every live field choice with a real capture', () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root,
    'src/app/admin/admin-event/admin-event-form/form-details/form-details.component.ts'), 'utf8');
  const fieldBlock = source.match(/fieldTypes = \[([\s\S]*?)\];/)[1];
  const titles = [...fieldBlock.matchAll(/title: '([^']+)'/g)].map(match => match[1]);
  const content = JSON.parse(fs.readFileSync(path.join(root, 'docs/user-guides.json')));
  const sections = content.topics.find(topic => topic.id === 'forms').sections;
  for (const title of titles) {
    const section = sections.find(section => section.title.startsWith(title + ' —'));
    assert(section, `Missing advanced field explanation: ${title}`);
    assert(content.screenImages.forms.some(image => image.section === section.title),
      `Missing real field dialog capture: ${title}`);
    assert(section.body.length && section.steps.length, `Missing instructions: ${title}`);
  }
  assert.equal(titles.length, 11);
});

test('getting started teaches form selection and creation before observation collection', () => {
  const root = path.resolve(__dirname, '..');
  const content = JSON.parse(fs.readFileSync(path.join(root, 'docs/user-guides.json')));
  const overview = content.topics.find(topic => topic.id === 'overview');
  const titles = overview.sections.map(section => section.title);
  assert(titles.indexOf('Choose a form before collecting an observation') < titles.indexOf('Create a basic event form'));
  assert(titles.indexOf('Create a basic event form') < titles.indexOf('Create an observation'));
  const basic = overview.sections.find(section => section.title === 'Create a basic event form');
  assert.match(basic.body.join(' '), /permission/);
  assert.match(basic.steps.join(' '), /forms.new/);
  assert.match(basic.steps.join(' '), /Map Symbology/);
  assert.match(basic.steps.join(' '), /Default/);
  assert.match(basic.steps.join(' '), /Observation Feed/);
  assert.match(basic.steps.join(' '), /Primary Field/);
  assert.match(basic.steps.join(' '), /Secondary Field/);
  assert.match(basic.body.join(' '), /not an external data feed/);
  assert.match(basic.steps.at(-1), /For further information.*Advanced forms/);
  for (const image of ['form-details', 'form-create', 'form-fields']) {
    assert(content.screenImages.overview.some(entry => entry.section === basic.title && entry.file === `docs/images/${image}.png`));
  }
  for (const image of ['form-symbology', 'form-observation-feed']) {
    assert(content.screenImages.overview.some(entry => entry.section === basic.title && entry.file === `docs/images/${image}.png`));
  }
  const advanced = content.topics.find(topic => topic.id === 'forms');
  assert.equal(advanced.title, 'Advanced forms');
  assert(!advanced.sections.some(section => section.title === basic.title));
});

test('the user guide entry is only in About MAGE and opens a new tab', () => {
  const root = path.resolve(__dirname, '..');
  for (const file of [
    'navigation/navigation.component.html',
    'admin/admin-shell/admin-navbar/admin-navbar.component.html',
    'ingress/authentication/local/local-authentication.component.html'
  ]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/app', file), 'utf8'), /routerLink.*\/help/);
  }
  const about = fs.readFileSync(path.join(root, 'src/app/about/about.component.html'), 'utf8');
  const link = about.match(/<a\b[^>]*routerLink[^>]*\/help[^>]*>/)?.[0];
  assert(link, 'About MAGE must expose the user guide');
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener noreferrer"/);
});

test('documentation maps use an event-linked OpenStreetMap imagery layer', () => {
  const { response } = require('./guide-capture-fixtures.cjs');
  const event = response(new URL('http://guide.invalid/api/events/1'));
  const layers = response(new URL('http://guide.invalid/api/events/1/layers'));
  assert.equal(layers[0].url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  assert.equal(layers[0].base, true);
  assert.deepEqual(event.layers, layers);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-guides-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.mkdirSync(path.join(root, 'src/app/help'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/workflow'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.0.0' }));
  const button = path.join(root, 'src/workflow/button.html');
  fs.writeFileSync(button, '<button data-guide="create"><mat-icon>add</mat-icon>Create entry</button>');
  const workflow = path.join(root, 'src/workflow/action.ts');
  fs.writeFileSync(workflow, 'export const steps = ["create", "save"];');
  const content = {
    controls: { create: 'src/workflow/button.html' },
    topics: [{
      id: 'overview', title: 'Overview', summary: 'Getting started', audience: 'Everyone',
      icon: 'explore', route: '/home', sources: ['src/workflow'], controlIds: ['create'],
      sections: [{ title: 'Create', body: [], steps: ['Choose {{control:create}}.'] }]
    }]
  };
  fs.writeFileSync(path.join(root, 'docs/user-guides.json'), JSON.stringify(content));
  return { root, button, workflow, content };
}

test('extracts the current control label/icon and resolves the same instructions for readers/export', t => {
  const f = fixture(t);
  const { document } = generate(f.root, { review: true });
  assert.equal(document.topics[0].sections[0].steps[0], 'Choose Create entry.');
  assert.deepEqual(document.topics[0].controls[0], { id: 'create', label: 'Create entry', icon: 'add' });
  assert.equal(document.topics[0].needsReview, false);
  assert.doesNotThrow(() => generate(f.root, { check: true }));
});

test('label and icon changes automatically update generated content and edition', t => {
  const f = fixture(t);
  const first = generate(f.root, { review: true });
  fs.writeFileSync(f.button, '<button data-guide="create"><mat-icon>note_add</mat-icon>New record</button>');
  const next = generate(f.root);
  assert.equal(next.document.topics[0].sections[0].steps[0], 'Choose New record.');
  assert.equal(next.document.topics[0].controls[0].icon, 'note_add');
  assert.notEqual(next.document.edition, first.document.edition);
  assert.equal(next.document.topics[0].needsReview, true);
});

test('icon-only buttons use their real accessible tooltip', t => {
  const f = fixture(t);
  fs.writeFileSync(f.button, '<button data-guide="create" matTooltip="Add point"><mat-icon>add_location</mat-icon></button>');
  assert.equal(compile(f.root).document.topics[0].controls[0].label, 'Add point');
});

test('removed and duplicate control markers fail instead of silently keeping old instructions', t => {
  const f = fixture(t);
  fs.writeFileSync(f.button, '<button>Create</button>');
  assert.throws(() => compile(f.root), /Missing or ambiguous/);
  fs.writeFileSync(f.button, '<button data-guide="create">One</button><button data-guide="create">Two</button>');
  assert.throws(() => compile(f.root), /Duplicate guide control/);
});

test('workflow changes remain flagged until an explicit review, including after regeneration', t => {
  const f = fixture(t);
  generate(f.root, { review: true });
  fs.writeFileSync(f.workflow, 'export const steps = ["create", "review", "save"];');
  assert.throws(() => generate(f.root, { check: true }), /stale/);
  const generated = generate(f.root);
  assert.deepEqual(generated.document.topics[0].changedSources, ['src/workflow/action.ts']);
  assert.throws(() => generate(f.root, { check: true }), /review required/);
  generate(f.root, { review: true });
  assert.doesNotThrow(() => generate(f.root, { check: true }));
});

test('guide instruction edits require review even when application sources are unchanged', t => {
  const f = fixture(t);
  generate(f.root, { review: true });
  f.content.topics[0].sections[0].steps.push('Review before saving.');
  fs.writeFileSync(path.join(f.root, 'docs/user-guides.json'), JSON.stringify(f.content));
  const next = generate(f.root);
  assert.ok(next.document.topics[0].changedSources.includes('Guide instructions'));
});

test('unknown control references and missing workflow files fail explicitly', t => {
  const f = fixture(t);
  f.content.topics[0].sections[0].steps = ['{{control:missing}}'];
  fs.writeFileSync(path.join(f.root, 'docs/user-guides.json'), JSON.stringify(f.content));
  assert.throws(() => compile(f.root), /Unknown guide control/);
  f.content.topics[0].sections[0].steps = [];
  f.content.topics[0].sources = ['does-not-exist'];
  fs.writeFileSync(path.join(f.root, 'docs/user-guides.json'), JSON.stringify(f.content));
  assert.throws(() => compile(f.root), /workflow source is missing/);
});

function picturedFixture(t) {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'docs/images'));
  f.image = path.join(f.root, 'docs/images/create.svg');
  fs.writeFileSync(f.image, '<svg xmlns="http://www.w3.org/2000/svg"><text x="1" y="20">Create entry</text></svg>');
  f.content.screenImages = { overview: [{
    section: 'Create', afterStep: 1, file: 'docs/images/create.svg',
    alt: 'Create entry screen', caption: 'Example screen reference'
  }] };
  f.save = () => fs.writeFileSync(path.join(f.root, 'docs/user-guides.json'), JSON.stringify(f.content));
  f.save();
  return f;
}

test('embeds screen pictures with alt text at their numbered instruction step', t => {
  const f = picturedFixture(t);
  const result = generate(f.root, { review: true });
  const image = result.document.topics[0].sections[0].images[0];
  assert.equal(image.afterStep, 1);
  assert.equal(image.alt, 'Create entry screen');
  assert.match(image.dataUrl, /^data:image\/svg\+xml;base64,/);
  assert.equal(Buffer.from(image.dataUrl.split(',')[1], 'base64').toString(), fs.readFileSync(f.image, 'utf8'));
  fs.writeFileSync(f.image, '<svg xmlns="http://www.w3.org/2000/svg"><text>Changed screen</text></svg>');
  const next = generate(f.root);
  assert(next.document.topics[0].needsReview);
  assert(next.document.topics[0].changedSources.includes('docs/images/create.svg'));
});

test('rejects missing, external, active or misplaced screen pictures', t => {
  const f = picturedFixture(t);
  for (const svg of [
    '<svg><script>alert(1)</script></svg>',
    '<svg><image href="https://example.invalid/image.png"/></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><foreignObject>HTML</foreignObject></svg>',
    '<svg><style>path{fill:url(https://example.invalid/paint)}</style></svg>'
  ]) {
    fs.writeFileSync(f.image, svg);
    assert.throws(() => compile(f.root), /self-contained/);
  }
  fs.writeFileSync(f.image, '<svg/>');
  const image = f.content.screenImages.overview[0];
  image.afterStep = 7; f.save();
  assert.throws(() => compile(f.root), /invalid step/);
  image.afterStep = 1; image.file = 'https://example.invalid/image.svg'; f.save();
  assert.throws(() => compile(f.root), /docs\/images/);
  image.file = 'docs/images/missing.svg'; f.save();
  assert.throws(() => compile(f.root), /Missing or unsafe/);
  image.file = 'docs/images/create.svg'; image.alt = ''; f.save();
  assert.throws(() => compile(f.root), /alternative text/);
});

function capturedFixture(t) {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'projects/core-lib'), { recursive: true });
  fs.mkdirSync(path.join(f.root, 'scripts'));
  fs.mkdirSync(path.join(f.root, 'docs/images'));
  for (const file of ['angular.json', 'package-lock.json',
    'scripts/guide-scenes.cjs', 'scripts/guide-capture-fixtures.cjs', 'scripts/capture-guide-screens.cjs', 'scripts/guide-browser.cjs']) {
    fs.writeFileSync(path.join(f.root, file), '{}');
  }
  const { sourceFingerprint } = require('./capture-guide-screens.cjs');
  const { scenes } = require('./guide-scenes.cjs');
  const crypto = require('node:crypto');
  const bytes = Buffer.from('isolated documentation image fixture');
  f.manifest = { sourceFingerprint: sourceFingerprint(f.root), screens: scenes.map(scene => {
    const file = `docs/images/${scene.id}.png`;
    fs.writeFileSync(path.join(f.root, file), bytes);
    return { id: scene.id, file, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }) };
  fs.writeFileSync(path.join(f.root, 'docs/guide-captures.json'), JSON.stringify(f.manifest));
  return f;
}

test('a changed application view cannot be marked current by acknowledging guide review', t => {
  const f = capturedFixture(t);
  generate(f.root, { review: true });
  fs.writeFileSync(f.button, '<button data-guide="create">Changed view</button>');
  assert.throws(() => generate(f.root, { review: true }), /source changed since guide screenshots/);
  assert.throws(() => generate(f.root), /guides:capture/);
});

test('altered screenshot bytes fail even when application source is unchanged', t => {
  const f = capturedFixture(t);
  fs.writeFileSync(path.join(f.root, f.manifest.screens[0].file), 'altered');
  assert.throws(() => compile(f.root), /Missing or changed capture image/);
});

test('guide-only generated output does not create a capture regeneration loop', t => {
  const f = capturedFixture(t);
  const { sourceFingerprint } = require('./capture-guide-screens.cjs');
  const before = sourceFingerprint(f.root);
  fs.writeFileSync(path.join(f.root, 'src/app/help/generated-guide.ts'), 'new guide edition');
  assert.equal(sourceFingerprint(f.root), before);
  assert.doesNotThrow(() => generate(f.root, { review: true }));
});

test('documentation fixtures refuse unexpected API calls and every mutation', () => {
  const { response } = require('./guide-capture-fixtures.cjs');
  assert.throws(() => response(new URL('http://127.0.0.1/api/unknown')), /Missing documentation fixture/);
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    assert.throws(() => response(new URL('http://127.0.0.1/api/users'), method), /Unapproved documentation request/);
  }
  const user = response(new URL('http://127.0.0.1/api/users/myself'));
  assert.equal(user.email, 'example@example.invalid');
});

test('portable registry URL normalization does not invalidate pictures, dependency versions do', t => {
  const f = capturedFixture(t);
  const { sourceFingerprint } = require('./capture-guide-screens.cjs');
  const file = path.join(f.root, 'package-lock.json');
  fs.writeFileSync(file, JSON.stringify({ packages: { demo: { version: '1', integrity: 'sha512-example', resolved: 'https://private.invalid/npm/demo.tgz' } } }));
  const before = sourceFingerprint(f.root);
  fs.writeFileSync(file, JSON.stringify({ packages: { demo: { version: '1', integrity: 'sha512-example', resolved: 'https://registry.npmjs.org/demo.tgz' } } }));
  assert.equal(sourceFingerprint(f.root), before);
  fs.writeFileSync(file, JSON.stringify({ packages: { demo: { version: '2', integrity: 'sha512-example' } } }));
  assert.notEqual(sourceFingerprint(f.root), before);
});

test('browser selection works outside Replit and rejects an invalid explicit browser', t => {
  const { findGuideBrowser } = require('./guide-browser.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-browser-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const executable = path.join(dir, 'chromium');
  fs.writeFileSync(executable, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  assert.equal(findGuideBrowser({ PATH: dir }, 'linux'), executable);
  assert.equal(findGuideBrowser({ CHROME_BIN: executable, PATH: '' }, 'linux'), executable);
  assert.throws(() => findGuideBrowser({ CHROME_BIN: path.join(dir, 'missing'), PATH: dir }), /CHROME_BIN/);
  assert.throws(() => findGuideBrowser({ PATH: '' }, 'linux'), /Install Chrome/);
  assert.throws(() => findGuideBrowser({ CHROME_BIN: dir }), /CHROME_BIN/);
});

test('a relocated checkout generates deterministically with no environment, credentials, network or browser', t => {
  const { spawnSync } = require('node:child_process');
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'scripts'));
  fs.copyFileSync(path.join(__dirname, 'generate-user-guides.cjs'),
    path.join(f.root, 'scripts/generate-user-guides.cjs'));
  const program = `
    require('node:net').Socket.prototype.connect = () => { throw new Error('Network forbidden'); };
    globalThis.fetch = globalThis.WebSocket = () => { throw new Error('Network forbidden'); };
    require('./scripts/generate-user-guides.cjs').generate(process.cwd(), {review: true});
  `;
  const run = () => {
    const child = spawnSync(process.execPath, ['-e', program], { cwd: f.root, env: {}, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    return fs.readFileSync(path.join(f.root, 'src/app/help/generated-guide.ts'), 'utf8');
  };
  const first = run();
  assert.equal(run(), first);
  fs.writeFileSync(f.button, '<button data-guide="create"><mat-icon>note_add</mat-icon>New entry</button>');
  const changed = run();
  assert.notEqual(changed, first);
  assert.match(changed, /Choose New entry/);
  assert.match(changed, /note_add/);
});

test('current packaged screenshots validate without a browser or hosting-specific services', t => {
  const { spawnSync } = require('node:child_process');
  const f = capturedFixture(t);
  for (const name of ['sync-guide-screens.cjs', 'capture-guide-screens.cjs',
    'guide-browser.cjs', 'guide-capture-fixtures.cjs', 'guide-scenes.cjs']) {
    fs.copyFileSync(path.join(__dirname, name), path.join(f.root, 'scripts', name));
  }
  const { sourceFingerprint } = require('./capture-guide-screens.cjs');
  f.manifest.sourceFingerprint = sourceFingerprint(f.root);
  fs.writeFileSync(path.join(f.root, 'docs/guide-captures.json'), JSON.stringify(f.manifest));
  const run = () => spawnSync(process.execPath, ['scripts/sync-guide-screens.cjs'], {
    cwd: f.root, env: {}, encoding: 'utf8'
  });
  assert.equal(run().status, 0);
  fs.writeFileSync(f.button, '<button data-guide="create">Changed</button>');
  const stale = run();
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /source changed/);
  assert.match(stale.stderr, /Install Chrome/);
});
