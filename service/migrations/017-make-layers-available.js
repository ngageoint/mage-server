const mongoose = require('mongoose'),
  async = require('async'),
  path = require('path'),
  geopackage = require('../utilities/geopackage'),
  environment = require('../environment/env'),
  Layer = require('../models/layer');

exports.id = 'make-layers-available';

exports.up = function(done) {
  console.log('\nUpdating all layers to have the state available');

  async.waterfall([getLayers, migrateLayers], function(err) {
    done(err);
  });
};

exports.down = function(done) {};

function getLayers(callback) {
  console.log('get layers');

  const LayerModel = mongoose.model('Layer');
  LayerModel.find({})
    .lean()
    .exec(function(err, layers) {
      callback(err, layers);
    });
}

function migrateLayers(layers, callback) {
  console.log('migrate layers');

  async.eachSeries(
    layers,
    function(layer, done) {
      Layer.Model.findById(layer._id)
        .lean()
        .exec(async function(err, layer) {
          if (layer.type === 'GeoPackage') {
            const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
            const gp = await geopackage.open(geopackagePath);
            layer.tables = geopackage.getTables(gp.geoPackage);
          }
          layer.state = 'available';
          await Layer.update(layer._id, layer, { overwrite: true });
          done();
        });
    },
    function(err) {
      callback(err);
    },
  );
}
