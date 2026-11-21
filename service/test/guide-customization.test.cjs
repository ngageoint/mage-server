const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { validateState, repository } = require('../src/models/guide-customization');
const routes = require('../src/routes/user-guide');

test('validates bounded plain-text overrides and rejects malformed/polluting payloads', () => {
  const valid = { revision: 2, overrides: { 'forms/attachment': { hidden: true, body: ['Example'], source: 'old' } } };
  assert.deepEqual(JSON.parse(JSON.stringify(validateState(valid))), valid);
  for (const value of [
    {}, { revision: -1, overrides: {} }, { revision: '1', overrides: {} },
    { revision: 0, overrides: { forms: { hidden: 'yes' } } },
    { revision: 0, overrides: { forms: { html: 'bad' } } },
    { revision: 0, overrides: JSON.parse('{"__proto__":{}}') },
    { revision: 0, overrides: { forms: { body: [123] } } },
    { revision: 0, overrides: { forms: { title: 'x'.repeat(301) } } }
  ]) assert.throws(() => validateState(value), e => e.status === 400);
  assert.throws(() => validateState({ revision: 0, overrides: { forms: { body: ['x'.repeat(300000)] } } }), e => e.status === 413);
});

function fakeModel() {
  const data = new Map();
  const query = fn => ({ lean: () => ({ exec: async () => fn() }) });
  return {
    data,
    findOne: filter => query(() => data.get(filter.type) || null),
    findOneAndUpdate: (filter, update) => query(() => {
      const current = data.get(filter.type);
      if (current?.settings.revision !== filter['settings.revision']) return null;
      const saved = { type: filter.type, settings: update.$set.settings };
      data.set(filter.type, saved);
      return saved;
    }),
    async create(doc) {
      if (data.has(doc.type)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
      data.set(doc.type, doc);
      return doc;
    }
  };
}
test('persists overrides separately and rejects stale and concurrent saves', async () => {
  const model = fakeModel();
  const repo = repository(model);
  assert.deepEqual(await repo.get('global'), { revision: 0, overrides: {} });
  const attempts = await Promise.allSettled([
    repo.save('global', { revision: 0, overrides: { forms: { title: 'First' } } }),
    repo.save('global', { revision: 0, overrides: { forms: { title: 'Second' } } })
  ]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal((await repo.get('global')).revision, 1);
  const reloaded = repository(model);
  assert.equal((await reloaded.get('global')).overrides.forms.title, 'First');
  await assert.rejects(repo.save('global', { revision: 0, overrides: {} }), e => e.status === 409);
  await reloaded.save('event-1', { revision: 0, overrides: { 'event-forms/form-1-field-1': { hidden: true } } });
  assert.equal((await reloaded.get('global')).overrides.forms.title, 'First');
});

function appFor(images) {
  const model = fakeModel();
  const app = express();
  app.use(express.json());
  const authenticate = (req, res, next) => {
    const kind = req.get('X-Test-Role');
    if (!kind) return res.sendStatus(401);
    req.user = { roleId: { name: kind === 'admin' || kind === 'no-permission' ? 'ADMIN_ROLE' : 'USER_ROLE',
      permissions: kind === 'admin' ? ['UPDATE_SETTINGS'] : [] } };
    next();
  };
  routes(app, { authentication: { bearerAuthentication: authenticate } }, {
    guides: repository(model), images,
    Event: { getById: (id, options, cb) => cb(null, id === '404' ? null : { id }) },
    permissions: { authorizeEventAccess: async (event, user) => event.id === '2' ? {} : null }
  });
  app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
  return app;
}
test('public reads work but writes require an authenticated administrator with settings permission', async () => {
  const app = appFor();
  const payload = { revision: 0, overrides: { forms: { title: 'Field manual' } } };
  await request(app).get('/api/user-guide/customizations').expect(200).expect('Cache-Control', 'no-store');
  await request(app).put('/api/user-guide/customizations').send(payload).expect(401);
  for (const role of ['reader', 'no-permission']) {
    await request(app).put('/api/user-guide/customizations').set('X-Test-Role', role).send(payload).expect(403);
  }
  await request(app).put('/api/user-guide/customizations').set('X-Test-Role', 'admin').send(payload).expect(200);
  await request(app).put('/api/user-guide/customizations').set('X-Test-Role', 'admin').send(payload).expect(409);
  const result = await request(app).get('/api/user-guide/customizations').expect(200);
  assert.equal(result.body.overrides.forms.title, 'Field manual');
});

test('stores screenshot files separately, publishes only saved references, and enforces event access', async t => {
  const fs = require('fs/promises');
  const path = require('path');
  const root = await fs.mkdtemp(path.join(require('os').tmpdir(), 'mage-guide-images-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { imageStore } = require('../src/models/guide-images');
  const images = imageStore(root);
  const app = appFor(images);
  const { Canvas } = require('skia-canvas');
  const canvas = new Canvas(10, 10);
  const dataUrl = `data:image/png;base64,${(await canvas.toBuffer('png')).toString('base64')}`;
  const base = '/api/user-guide/customizations';
  await request(app).post(`${base}/images`).send({ dataUrl }).expect(401);
  await request(app).post(`${base}/images`).set('X-Test-Role', 'reader').send({ dataUrl }).expect(403);
  await request(app).post(`${base}/images`).set('X-Test-Role', 'admin').send({ dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }).expect(400);
  await request(app).post(`${base}/images`).set('X-Test-Role', 'admin').send({ dataUrl: 'data:image/png;base64,PHN2Zy8+' }).expect(400);
  const upload = await request(app).post(`${base}/images`).set('X-Test-Role', 'admin').send({ dataUrl }).expect(201);
  const image = { assetId: upload.body.assetId, afterStep: 0, afterParagraph: 1, alt: 'Training screen', caption: 'Example only' };
  await request(app).get(`${base}/images/${image.assetId}`).expect(404);
  const state = await request(app).put(base).set('X-Test-Role', 'admin')
    .send({ revision: 0, overrides: { 'overview/training': { images: [image] } } }).expect(200);
  assert.equal(JSON.stringify(state.body).includes('data:image'), false);
  const served = await request(app).get(`${base}/images/${image.assetId}`).expect(200).expect('Content-Type', /image\/png/);
  assert.deepEqual(served.body, await images.read('global', image.assetId));
  await request(app).get(`/api/user-guide/events/1/images/${image.assetId}`).expect(401);
  await request(app).get(`/api/user-guide/events/2/images/${image.assetId}`).set('X-Test-Role', 'reader').expect(403);
  const privateBase = '/api/user-guide/events/1';
  const privateUpload = await request(app).post(`${privateBase}/images`).set('X-Test-Role', 'admin').send({ dataUrl }).expect(201);
  const privateImage = { ...image, assetId: privateUpload.body.assetId };
  await request(app).put(privateBase).set('X-Test-Role', 'admin')
    .send({ revision: 0, overrides: { 'event-forms/field': { images: [privateImage] } } }).expect(200);
  await request(app).get(`${privateBase}/images/${privateImage.assetId}`).set('X-Test-Role', 'reader').expect(200);
  await request(app).get(`${base}/images/${privateImage.assetId}`).expect(404);
  await request(app).put(base).set('X-Test-Role', 'admin')
    .send({ revision: 1, overrides: { 'overview/training': { images: [privateImage] } } }).expect(404);
  await request(app).put(base).set('X-Test-Role', 'admin')
    .send({ revision: 1, overrides: { 'overview/training': { images: [] } } }).expect(200);
  await request(app).get(`${base}/images/${image.assetId}`).expect(404);
});

test('rejects inline image bytes, unsafe references and malformed positions in settings', () => {
  const image = { assetId: 'a'.repeat(32), afterStep: 0, afterParagraph: 1, alt: 'Training', caption: '' };
  const state = image => ({ revision: 0, overrides: { 'overview/training': { images: [image] } } });
  assert.equal(validateState(state(image)).overrides['overview/training'].images[0].afterParagraph, 1);
  for (const invalid of [
    { ...image, dataUrl: 'data:image/png;base64,A' }, { ...image, assetId: '../secret' },
    { ...image, afterStep: -1 }, { ...image, afterParagraph: 1.5 }, { ...image, alt: '' },
    { ...image, generatedIndex: 0 }
  ]) assert.throws(() => validateState(state(invalid)), err => err.status === 400);
});
test('event guide reads enforce event membership and never leak through the public guide', async () => {
  const app = appFor();
  const url = '/api/user-guide/events/1';
  const payload = { revision: 0, overrides: { 'event-forms/form-1-field-1': { title: 'Private training field' } } };
  await request(app).get(url).expect(401);
  await request(app).get('/api/user-guide/events/2').set('X-Test-Role', 'reader').expect(403);
  await request(app).get('/api/user-guide/events/404').set('X-Test-Role', 'reader').expect(404);
  await request(app).get('/api/user-guide/events/not-numeric').set('X-Test-Role', 'reader').expect(400);
  await request(app).put(url).set('X-Test-Role', 'reader').send(payload).expect(403);
  await request(app).put(url).set('X-Test-Role', 'admin').send(payload).expect(200);
  const privateGuide = await request(app).get(url).set('X-Test-Role', 'reader').expect(200);
  assert.equal(privateGuide.body.overrides['event-forms/form-1-field-1'].title, 'Private training field');
  const publicGuide = await request(app).get('/api/user-guide/customizations').expect(200);
  assert.equal(JSON.stringify(publicGuide.body).includes('Private training field'), false);
});
