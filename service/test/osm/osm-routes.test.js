const assert = require('assert');
const express = require('express');
const supertest = require('supertest');
const proxyquire = require('proxyquire');
const { OsmSearch } = require('../../src/utilities/osm-search');
const bounds = { south: 38.12, west: -77.13, north: 38.13, east: -77.12 };

describe('authenticated OSM route contracts', function () {
  let app, now, exports, service;
  beforeEach(function () {
    now = 100000; exports = 0;
    service = new OsmSearch({ now: () => now, fetch: async () => ({ elements: [
      { type: 'node', id: 1, lat: 38.125, lon: -77.125, tags: { name: 'Hospital' } }
    ] }) });
    app = express();
    app.use(express.json());
    const init = proxyquire('../../lib/routes/osm', {
      '../utilities/osm-search': { OsmSearch: function () { return service; } },
      '../utilities/osm-geopackage': { exportGeoPackage: async features => {
        exports++; assert.equal(features.length, 1); return Buffer.from('SQLite fixture');
      } }
    });
    init(app, { authentication: { bearerAuthentication: (req, res, next) => {
      const user = req.get('Authorization');
      if (!user) return res.sendStatus(401);
      req.user = { id: user, roleId: { permissions: user === 'denied' ? [] : ['READ_LAYER_EVENT'] } };
      next();
    } } });
  });
  it('requires authentication and a layer-read role before search or export', async function () {
    for (const route of ['search', 'export']) {
      await supertest(app).post(`/api/osm/${route}`).send({}).expect(401);
      await supertest(app).post(`/api/osm/${route}`).set('Authorization', 'denied').send({}).expect(403);
    }
    assert.equal(exports, 0);
  });
  it('exports only owned selections and sets the GeoPackage download headers', async function () {
    const result = await supertest(app).post('/api/osm/search').set('Authorization', 'alice')
      .send({ bounds, search: 'hospital', url: 'http://ignored.test', query: 'out;' }).expect(200);
    assert.equal(result.body.features.length, 1);
    const selection = { searchId: result.body.searchId, ids: ['node/1'] };
    await supertest(app).post('/api/osm/export').set('Authorization', 'bob').send(selection).expect(410);
    const exported = await supertest(app).post('/api/osm/export').set('Authorization', 'alice').send(selection).expect(200);
    assert.match(exported.headers['content-type'], /^application\/geopackage\+sqlite3/);
    assert.match(exported.headers['content-disposition'], /osm-search.gpkg/);
    assert.equal(exports, 1);
    now += 600001;
    await supertest(app).post('/api/osm/export').set('Authorization', 'alice').send(selection).expect(410);
  });
  it('rejects invalid queries with a clear client error', async function () {
    const result = await supertest(app).post('/api/osm/search').set('Authorization', 'alice')
      .send({ bounds, search: '"];out;' }).expect(400);
    assert.equal(typeof result.body.message, 'string');
  });
  it('exports CSV and KML with attachment types using the same authorization and selection checks', async function () {
    const result = await service.search('alice', { bounds, search: 'hospital' });
    for (const format of ['csv', 'kml']) {
      const selection = { searchId: result.searchId, ids: ['node/1'], format };
      await supertest(app).post('/api/osm/export').set('Authorization', 'bob').send(selection).expect(410);
      const file = await supertest(app).post('/api/osm/export').set('Authorization', 'alice').send(selection).expect(200);
      assert(file.headers['content-disposition'].includes(`osm-search.${format}`));
      assert(file.headers['content-type'].includes(format === 'csv' ? 'text/csv' : 'application/vnd.google-earth.kml+xml'));
      assert.equal(file.headers['cache-control'], 'no-store');
    }
    assert.equal(exports, 0);
    await supertest(app).post('/api/osm/export').set('Authorization', 'alice')
      .send({ searchId: result.searchId, ids: ['node/1'], format: 'exe' }).expect(400);
    now += 600001;
    await supertest(app).post('/api/osm/export').set('Authorization', 'alice')
      .send({ searchId: result.searchId, ids: ['node/1'], format: 'csv' }).expect(410);
  });
  it('bounds concurrent export work', async function () {
    const result = await service.search('alice', { bounds, search: 'hospital' });
    service.exports = 1;
    await supertest(app).post('/api/osm/export').set('Authorization', 'alice')
      .send({ searchId: result.searchId, ids: ['node/1'] }).expect(429);
    assert.equal(exports, 0);
  });
});
