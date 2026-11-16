const assert = require('assert');
const { DOMParser } = require('@xmldom/xmldom');
const { exportCsv, exportKml } = require('../../src/utilities/osm-download');
const { ATTRIBUTION } = require('../../src/utilities/osm-search');
const feature = (geometry, name = 'Test "location", line\nTwo') => ({
  type: 'Feature', id: 'node/1', geometry,
  properties: { osm_id: '1', osm_type: 'node', name, tags: '{"amenity":"hospital"}',
    source: 'https://www.openstreetmap.org/node/1', attribution: ATTRIBUTION }
});
const point = { type: 'Point', coordinates: [-77.1, 38.2] };

describe('OSM CSV and KML downloads', function () {
  it('produces UTF-8 CSV with escaped text, exact geometry and attribution', function () {
    const csv = exportCsv([feature(point)]).toString('utf8');
    assert(csv.startsWith('\ufeff"osm_id","osm_type"'));
    assert(csv.includes('"Test ""location"", line\nTwo"'));
    assert(csv.includes('"-77.1","38.2"'));
    assert(csv.includes('""coordinates"":[-77.1,38.2]'));
    assert(csv.includes(ATTRIBUTION));
    assert(csv.endsWith('\r\n'));
  });
  it('neutralizes spreadsheet formulas from untrusted OSM strings', function () {
    for (const name of ['=HYPERLINK("bad")', '+cmd', '-cmd', '@SUM(1)', '\t=1']) {
      const csv = exportCsv([feature(point, name)]).toString('utf8');
      assert(csv.includes('"' + ("'" + name).replace(/"/g, '""') + '"'));
    }
  });
  it('retains non-point geometry instead of inventing CSV centroids', function () {
    const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    const csv = exportCsv([feature(polygon)]).toString('utf8');
    assert(csv.includes('"Polygon","","",'));
    assert(csv.includes('""coordinates"":[[[0,0],[1,0],[1,1],[0,0]]]'));
  });
  it('produces valid KML with escaped text and original point coordinates', function () {
    const kml = exportKml([feature(point, '<script>&"bad"</script>')]).toString('utf8');
    assert(!kml.includes('<script>'));
    const document = new DOMParser().parseFromString(kml, 'application/xml');
    assert.equal(document.documentElement.namespaceURI, 'http://www.opengis.net/kml/2.2');
    assert.equal(document.getElementsByTagName('Placemark').length, 1);
    assert.equal(document.getElementsByTagName('coordinates')[0].textContent, '-77.1,38.2');
    assert.equal(document.getElementsByTagName('name')[1].textContent, '<script>&"bad"</script>');
    assert(kml.includes('attribution'));
  });
  it('preserves polygon holes and multi-geometries in KML', function () {
    const ring = [[0, 0], [5, 0], [5, 5], [0, 0]];
    const hole = [[1, 1], [2, 1], [2, 2], [1, 1]];
    const kml = exportKml([
      feature({ type: 'MultiPolygon', coordinates: [[ring, hole]] }),
      feature({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] })
    ]).toString('utf8');
    const document = new DOMParser().parseFromString(kml, 'application/xml');
    assert.equal(document.getElementsByTagName('innerBoundaryIs').length, 1);
    assert.equal(document.getElementsByTagName('MultiGeometry').length, 2);
    assert.equal(document.getElementsByTagName('LineString').length, 2);
  });
});
