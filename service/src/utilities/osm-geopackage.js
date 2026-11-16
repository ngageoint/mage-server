const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { GeoPackageAPI } = require('@ngageoint/geopackage');

// Always use the installed Mage GeoPackage implementation. The returned file
// follows the ordinary /api/layers multipart upload/validation/storage path.
async function exportGeoPackage(features) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mage-osm-'));
  let gp;
  try {
    const file = path.join(directory, 'osm-search.gpkg');
    gp = await GeoPackageAPI.create(file);
    gp.createFeatureTableFromProperties('osm_features',
      ['osm_id', 'osm_type', 'name', 'tags', 'source', 'attribution'].map(name => ({ name, dataType: 'TEXT' })));
    // Use the synchronous single-feature API: bulk insertion in GeoPackage 4
    // schedules work outside its Promise executor and can fail without rejecting.
    for (const feature of features) gp.addGeoJSONFeatureToGeoPackage(feature, 'osm_features');
    const contents = gp.contentsDao.queryForId('osm_features');
    contents.description = '© OpenStreetMap contributors · ODbL 1.0 · https://www.openstreetmap.org/copyright';
    let west = 180, south = 90, east = -180, north = -90;
    const visit = coordinates => {
      if (typeof coordinates[0] === 'number') {
        west = Math.min(west, coordinates[0]); east = Math.max(east, coordinates[0]);
        south = Math.min(south, coordinates[1]); north = Math.max(north, coordinates[1]);
      } else coordinates.forEach(visit);
    };
    features.forEach(feature => visit(feature.geometry.coordinates));
    Object.assign(contents, { min_x: west, min_y: south, max_x: east, max_y: north });
    gp.contentsDao.update(contents);
    gp.close();
    gp = null;
    return await fs.readFile(file);
  } finally {
    if (gp) gp.close();
    await fs.remove(directory);
  }
}

module.exports = { exportGeoPackage };
