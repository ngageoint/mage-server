const assert = require('assert');
const { OsmSearch, buildQuery, ATTRIBUTION } = require('../../src/utilities/osm-search');
const { geometryOf, toFeatures } = require('../../src/utilities/osm-geometry');
const bounds = { south: 38.123456789, west: -77.123456789, north: 38.13, east: -77.12 };
const input = (search = 'hospital') => ({ bounds, search });
const point = { type: 'node', id: 1, lat: 38.125, lon: -77.122, tags: { name: '<img src=x onerror=alert(1)>' } };
const p = (lon, lat) => ({ lon, lat });
const ring = [p(0, 0), p(2, 0), p(2, 2), p(0, 2), p(0, 0)];
const bad = fn => assert.throws(fn, error => error.status >= 400);

describe('bounded OSM search', function () {
  it('identifies MAGE to Overpass without exposing installation or user identifiers', async function () {
    const request = require('superagent');
    const originalPost = request.post;
    const headers = {};
    let target, redirects, payload;
    const chain = {
      set(name, value) { headers[name] = value; return this; },
      redirects(value) { redirects = value; return this; },
      type() { return this; },
      send(value) { payload = value; return this; },
      timeout() { return this; },
      maxResponseSize() { return this; },
      accept() { return Promise.resolve({ body: { elements: [point] } }); }
    };
    request.post = endpoint => { target = endpoint; return chain; };
    try {
      const service = new OsmSearch({ endpoint: 'https://configured.example.test/api/interpreter' });
      const result = await service.search('private-test-user', input());
      assert.equal(result.features.length, 1);
      assert.equal(target, service.endpoint);
      assert.equal(redirects, 0);
      assert.equal(payload.data, buildQuery(input()));
      assert.equal(headers['User-Agent'], 'MAGE-OSM-Search (+https://github.com/ngageoint/mage-server)');
      assert(!JSON.stringify(headers).includes('private-test-user'));
    } finally { request.post = originalPost; }
  });
  it('does not misdiagnose a provider gateway timeout as an oversized search area', async function () {
    const service = new OsmSearch({
      endpoint: 'https://configured.example.test/api/interpreter', wait: async () => {},
      transport: async () => { const error = new Error('gateway'); error.status = 504; throw error; }
    });
    await assert.rejects(service.search('u', input()), error =>
      error.status === 504 && /gateway timed out/.test(error.message) &&
      /does not by itself mean/.test(error.message));
  });
  it('preserves exact bounds and constructs a fixed limited query', function () {
    const query = buildQuery(input());
    assert(query.includes('(38.123456789,-77.123456789,38.13,-77.12)'));
    assert(query.includes('["amenity"="hospital"]'));
    assert(query.endsWith('out geom 501;'));
    assert(buildQuery(input('building=*')).includes('["building"]'));
    assert(buildQuery(input('Main Street')).includes('["name"~"Main Street",i]'));
    assert(buildQuery(input('constructor')).includes('["name"~"constructor",i]'));
    assert(buildQuery(input('__proto__')).includes('["name"~"__proto__",i]'));
  });
  it('rejects invalid, large, reversed, date-line, polar, and nonnumeric bounds', function () {
    for (const delta of [{ south: NaN }, { west: '-77' }, { north: 44 }, { east: -78 },
      { west: 179, east: -179 }, { south: 86, north: 86.1 }, { north: Infinity }, { west: -181 }]) {
      bad(() => buildQuery({ ...input(), bounds: { ...bounds, ...delta } }));
    }
    bad(() => buildQuery({ search: 'cafe' }));
  });
  it('allows regional extents while keeping side and area caps', function () {
    assert(buildQuery({ search: 'hospital', bounds: { south: 38, west: -79, north: 40, east: -77 } }));
    assert(buildQuery({ search: 'hospital', bounds: { south: 0, west: 0, north: 0.25, east: 0.25 } }));
    bad(() => buildQuery({ search: 'hospital', bounds: { south: 0, west: 0, north: 5.01, east: 0.1 } }));
    bad(() => buildQuery({ search: 'hospital', bounds: { south: 0, west: 0, north: 5, east: 5 } }));
  });
  it('fails over rejected public providers and does not repeat a successful request', async function () {
    const calls = [];
    const service = new OsmSearch({ transport: async endpoint => {
      calls.push(endpoint);
      if (calls.length === 1) { const error = new Error('blocked'); error.status = 406; throw error; }
      return { elements: [point] };
    } });
    const result = await service.search('u', input());
    assert.equal(result.features.length, 1);
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0], calls[1]);
  });
  it('does not send custom-provider queries to public fallback servers', async function () {
    const calls = [];
    const service = new OsmSearch({ endpoint: 'https://private.example.test/api/interpreter', transport: async endpoint => {
      calls.push(endpoint);
      const error = new Error('timeout'); error.timeout = true; throw error;
    } });
    await assert.rejects(service.search('u', input()), error => error.status === 504 && /timed out/.test(error.message));
    assert.deepEqual(calls, Array(2).fill('https://private.example.test/api/interpreter'));
  });
  it('retries a transient custom-provider gateway timeout without requiring another search', async function () {
    let attempts = 0;
    const waits = [];
    const service = new OsmSearch({
      endpoint: 'https://private.example.test/api/interpreter',
      wait: async ms => waits.push(ms),
      transport: async () => {
        if (++attempts === 1) { const e = new Error('gateway'); e.status = 504; throw e; }
        return { elements: [point] };
      }
    });
    assert.equal((await service.search('u', input())).features.length, 1);
    assert.equal(attempts, 2);
    assert.deepEqual(waits, [750]);
  });
  it('classifies exhausted HTTP 504s as timeouts and never retries authorization errors', async function () {
    for (const status of [504, 403]) {
      let attempts = 0;
      const service = new OsmSearch({
        endpoint: 'https://private.example.test/api/interpreter', wait: async () => {},
        transport: async () => { attempts++; const e = new Error('private body'); e.status = status; throw e; }
      });
      await assert.rejects(service.search('u', input()), e =>
        status === 504 ? e.status === 504 && /timed out/.test(e.message) : e.status === 502);
      assert.equal(attempts, status === 504 ? 2 : 1);
    }
  });
  it('reports rejected, rate-limited and incomplete provider responses without leaking bodies', async function () {
    for (const status of [406, 429]) {
      const service = new OsmSearch({ transport: async () => {
        const error = new Error('sensitive response body'); error.status = status; throw error;
      } });
      await assert.rejects(service.search('u', input()), error =>
        error.status === (status === 429 ? 503 : 502) &&
        !error.message.includes('sensitive') && error.message.includes(status === 429 ? 'rate-limited' : '406'));
    }
    const service = new OsmSearch({ transport: async () => ({ remark: 'runtime error' }) });
    await assert.rejects(service.search('u', input()), error => error.status === 502 && /incomplete/.test(error.message));
  });
  it('does not accept query language, regex, arbitrary URLs, or excessive input', function () {
    for (const search of ['', 'x'.repeat(65), 'amenity=hospital"];out;', '[name]', '.*',
      'https://attacker.test', 'name=a|b', 'name="foo"', 'a\n);out;']) bad(() => buildQuery(input(search)));
  });
  it('rejects an insecure or credential-bearing administrator endpoint', function () {
    bad(() => { try { new OsmSearch({ endpoint: 'http://example.test' }); } catch (e) { e.status = 400; throw e; } });
    assert.throws(() => new OsmSearch({ endpoint: 'https://user:password@example.test' }));
  });
  it('caches exact searches, throttles users, and binds expiring selections to their owner', async function () {
    let now = 100000, calls = 0;
    const service = new OsmSearch({ now: () => now, fetch: async () => { calls++; return { elements: [point] }; } });
    const result = await service.search('user1', input());
    assert.equal(result.features[0].properties.attribution, ATTRIBUTION);
    assert.equal(result.features[0].properties.name, point.tags.name);
    await assert.rejects(service.search('user1', input()), e => e.status === 429);
    now += 5001;
    assert.equal((await service.search('user1', input())).searchId, result.searchId);
    assert.equal(calls, 1);
    assert.equal(service.selected('user1', { searchId: result.searchId, ids: ['node/1'] }).length, 1);
    bad(() => service.selected('user2', { searchId: result.searchId, ids: ['node/1'] }));
    for (const ids of [[], ['node/2'], ['node/1', 'node/1'], [1]]) {
      bad(() => service.selected('user1', { searchId: result.searchId, ids }));
    }
    now += 600001;
    bad(() => service.selected('user1', { searchId: result.searchId, ids: ['node/1'] }));
  });
  it('reports empty results, incomplete responses, result overflow and network errors', async function () {
    const service = data => new OsmSearch({ fetch: async () => data });
    assert.deepEqual((await service({ elements: [] }).search('u', input())).features, []);
    for (const data of [null, {}, { elements: [], remark: 'timeout' }, { elements: Array(501).fill(point) }]) {
      await assert.rejects(service(data).search('u', input()), e => e.status === 502 || e.status === 422);
    }
    await assert.rejects(new OsmSearch({ fetch: async () => { throw Error('timeout'); } }).search('u', input()),
      e => e.status === 502 && !e.message.includes('https://'));
  });
  it('admits a 21st distinct search, evicts old selections cleanly, and retains the cache bound', async function () {
    const service = new OsmSearch({ fetch: async () => ({ elements: [point] }) });
    const results = [];
    for (let i = 0; i < 21; i++) results.push(await service.search(`user${i}`, input(`name${i}`)));
    assert.equal(service.entries.size, 20);
    assert.throws(() => service.selected('user0', { searchId: results[0].searchId, ids: ['node/1'] }),
      e => e.status === 410);
    assert.equal(service.selected('user20', { searchId: results[20].searchId, ids: ['node/1'] }).length, 1);
    assert.equal(service.selected('user1', { searchId: results[1].searchId, ids: ['node/1'] }).length, 1);
  });
  it('keeps recently reused searches when evicting at capacity', async function () {
    let now = 100000;
    const service = new OsmSearch({ now: () => now, fetch: async () => ({ elements: [point] }) });
    const results = [];
    for (let i = 0; i < 20; i++) results.push(await service.search(`user${i}`, input(`name${i}`)));
    now += 5001;
    assert.equal((await service.search('user0', input('name0'))).searchId, results[0].searchId);
    await service.search('newUser', input('new query'));
    assert.equal(service.entries.size, 20);
    assert.equal(service.selected('user0', { searchId: results[0].searchId, ids: ['node/1'] }).length, 1);
    assert.throws(() => service.selected('user1', { searchId: results[1].searchId, ids: ['node/1'] }),
      e => e.status === 410);
  });
  it('caps concurrent upstream requests and releases slots on failure', async function () {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const service = new OsmSearch({ fetch: async () => { await gate; return { elements: [] }; } });
    const first = service.search('a', input()), second = service.search('b', input());
    await assert.rejects(service.search('c', input()), e => e.status === 503);
    release();
    await Promise.all([first, second]);
    assert.equal(service.active, 0);
  });
});

describe('OSM geometry review and export data', function () {
  it('preserves points, paths, closed roads, and building polygons', function () {
    assert.equal(geometryOf(point).type, 'Point');
    assert.equal(geometryOf({ type: 'way', geometry: ring, tags: { highway: 'residential' } }).type, 'LineString');
    assert.equal(geometryOf({ type: 'way', geometry: ring, tags: { building: 'yes' } }).type, 'Polygon');
    assert.equal(geometryOf({ type: 'way', geometry: ring.slice(0, 3), tags: { building: 'yes' } }).type, 'LineString');
  });
  it('assembles split outer rings and holes and retains route paths', function () {
    const members = [{ type: 'way', role: 'outer', geometry: ring.slice(0, 3) },
      { type: 'way', role: 'outer', geometry: [ring[0], ring[3], ring[2]] },
      { type: 'way', role: 'inner', geometry: [p(.2, .2), p(.5, .2), p(.5, .5), p(.2, .2)] }];
    const polygon = geometryOf({ type: 'relation', tags: { type: 'multipolygon' }, members });
    assert.equal(polygon.type, 'MultiPolygon');
    assert.equal(polygon.coordinates[0].length, 2);
    assert.equal(geometryOf({ type: 'relation', tags: { type: 'route' }, members }).type, 'MultiLineString');
    assert.equal(geometryOf({ type: 'relation', tags: { type: 'multipolygon' }, members: members.slice(0, 1) }), null);
  });
  it('skips malformed geometry explicitly rather than inventing coordinates', function () {
    const result = toFeatures([null, { type: 'node', id: 2, lat: 100, lon: 0 },
      { type: 'way', id: 3, geometry: [null, p(0, 0)] }, { members: 'invalid' }, point], ATTRIBUTION);
    assert.equal(result.skipped, 4);
    assert.equal(result.features.length, 1);
  });
  it('bounds total coordinate work', function () {
    bad(() => toFeatures([{ type: 'way', id: 1, geometry: Array(30001).fill(p(0, 0)) }], ATTRIBUTION));
  });
});
