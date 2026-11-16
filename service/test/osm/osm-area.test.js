const assert = require('assert');
const { buildQuery, OsmSearch } = require('../../src/utilities/osm-search');
const area = coordinates => ({ type: 'Polygon', coordinates: [coordinates] });
const triangle = [[-90.5, 38.6], [-90.3, 38.6], [-90.4, 38.7], [-90.5, 38.6]];
const input = shape => ({ search: 'school', area: shape });
describe('drawn OSM areas', function () {
  it('uses a true latitude/longitude poly filter, not the polygon bounding rectangle', function () {
    const q = buildQuery(input(area(triangle)));
    assert(q.includes('nwr["amenity"="school"](poly:"38.6 -90.5 38.6 -90.3 38.7 -90.4")'));
    assert(q.endsWith('out geom 501;'));
  });
  it('accepts concave areas and either winding direction', function () {
    const ring = [[0, 0], [1, 0], [0.5, 0.5], [1, 1], [0, 1], [0, 0]];
    for (const r of [ring, ring.slice().reverse()]) assert(buildQuery(input(area(r))).includes('(poly:'));
  });
  it('rejects malformed, open, crossing, degenerate, injected and excessive polygons', function () {
    const bad = [
      null, {}, { type: 'Point', coordinates: triangle }, { type: 'Polygon', coordinates: [triangle, triangle] },
      area(triangle.slice(0, -1)), area([[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]),
      area([[0, 0], [1, 1], [2, 2], [0, 0]]), area([[0, 0], [1, 1], [1, 1], [0, 0]]),
      area([[0, 0], ['1);out;', 1], [1, 0], [0, 0]]),
      area([[0, 0], [1, Infinity], [1, 0], [0, 0]]),
      area([[0, 0], [1, 86], [1, 0], [0, 0]]),
      area(Array.from({ length: 66 }, (_, i) => [i, i]))
    ];
    for (const shape of bad) assert.throws(() => buildQuery(input(shape)), e => e.status === 400);
  });
  it('derives safety limits from the actual polygon, never a forged small bounding box', function () {
    const shape = area([[0, 0], [10, 0], [10, 10], [0, 0]]);
    assert.throws(() => buildQuery({ ...input(shape), bounds: { south: 0, west: 0, north: 0.01, east: 0.01 } }), e => e.status === 422);
    assert.throws(() => buildQuery(input(area([[179, 0], [-179, 0], [-179, 1], [179, 0]]))), e => e.status === 422);
  });
  it('keeps distinct polygons with equal bounding boxes in separate user-owned search entries', async function () {
    let calls = 0;
    const service = new OsmSearch({ fetch: async () => { calls++; return { elements: [] }; }, now: () => calls * 6000 });
    const first = area([[0, 0], [1, 0], [0, 1], [0, 0]]);
    const second = area([[0, 1], [1, 0], [1, 1], [0, 1]]);
    const a = await service.search('test', input(first));
    const b = await service.search('test', input(second));
    assert.notEqual(a.searchId, b.searchId);
    assert.equal(calls, 2);
  });
});
