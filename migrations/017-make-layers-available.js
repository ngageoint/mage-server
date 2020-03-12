const mongoose = require('mongoose'),
  path = require('path'),
  geopackage = require('../utilities/geopackage'),
  environment = require('../environment/env');

exports.id = 'make-layers-available';

exports.up = async function(done) {
  console.log('\nUpdating all layers to have the state available');

  try {
    await migrateLayers();
    done();
  } catch(err) {
    console.log('Failed layer migration', err);
    done(err);
  }
};

exports.down = function(done) {
  done();
};

async function migrateLayers() {
  const LayerModel = mongoose.model('Layer');
  const layers = await LayerModel.find({});

  for (const layer of layers) {
    if (layer.type === 'GeoPackage') {
      try {
        const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
        const gp = await geopackage.open(geopackagePath);
        layer.tables = geopackage.getTables(gp.geoPackage);
      } catch (err) {
        console.log('Error opening GeoPackage file, skipping', err);
      }
    }

    layer.state = 'available';
    await layer.save();
  }
}
