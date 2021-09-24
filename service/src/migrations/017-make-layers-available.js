const mongoose = require('mongoose'),
  path = require('path'),
  geopackage = require('../utilities/geopackage'),
  environment = require('../environment/env');

exports.id = 'make-layers-available';

exports.up = async function(done) {
  this.log('updating all layers to the available state');
  try {
    await migrateLayers.call(this);
    done();
  } catch(err) {
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
      const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
      try {
        const gp = await geopackage.open(geopackagePath);
        layer.tables = geopackage.getTables(gp.geoPackage);
      } catch (err) {
        this.log(`migration [${exports.id}] error opening geopackage file ${geopackagePath}; skipping - `, err);
      }
    }
    layer.state = 'available';
    await layer.save();
  }
}
