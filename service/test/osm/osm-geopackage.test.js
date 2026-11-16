const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { GeoPackageAPI, FeatureTiles } = require('@ngageoint/geopackage');
const { exportGeoPackage } = require('../../src/utilities/osm-geopackage');
const { toFeatures } = require('../../src/utilities/osm-geometry');
const { ATTRIBUTION } = require('../../src/utilities/osm-search');

describe('OSM GeoPackage compatibility', function () {
  this.timeout(30000);
  it('exports a valid EPSG:4326 package with selected geometry, extent and attribution that Mage can render', async function () {
    const features = toFeatures([
      { type: 'node', id: 1, lat: 38.125, lon: -77.122, tags: { name: '<script>not HTML</script>' } },
      { type: 'way', id: 2, geometry: [{ lat: 38.124, lon: -77.123 }, { lat: 38.126, lon: -77.121 }] },
      { type: 'way', id: 3, tags: { building: 'yes' }, geometry: [
        { lat: 38.124, lon: -77.123 }, { lat: 38.126, lon: -77.123 },
        { lat: 38.126, lon: -77.121 }, { lat: 38.124, lon: -77.123 }
      ] }
    ], ATTRIBUTION).features;
    const buffer = await exportGeoPackage(features);
    assert.equal(buffer.slice(0, 15).toString(), 'SQLite format 3');
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mage-osm-test-'));
    let gp, tiles;
    try {
      const file = path.join(dir, 'test.gpkg');
      await fs.writeFile(file, buffer);
      gp = await GeoPackageAPI.open(file);
      assert.deepEqual(gp.validate().filter(e => e.fatal), []);
      const dao = gp.getFeatureDao('osm_features');
      assert.equal(dao.count(), 3);
      assert.equal(dao.srs.organization_coordsys_id, 4326);
      const row = dao.queryForId(1);
      assert.equal(row.getValueWithColumnName('attribution'), ATTRIBUTION);
      assert.equal(row.getValueWithColumnName('name'), '<script>not HTML</script>');
      assert.equal(gp.contentsDao.queryForId('osm_features').min_x, -77.123);
      tiles = new FeatureTiles(dao, 256, 256);
      const x = Math.floor((-77.122 + 180) / 360 * (1 << 14));
      const lat = 38.125 * Math.PI / 180;
      const y = Math.floor((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * (1 << 14));
      const tile = await tiles.drawTile(x, y, 14);
      assert(tile, 'feature tiles should render using the existing Mage library');
    } finally {
      if (tiles) tiles.cleanup();
      if (gp) gp.close();
      await fs.remove(dir);
    }
  });
});
