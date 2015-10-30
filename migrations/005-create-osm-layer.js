var Layer = require('../models/layer');

exports.id = 'create-initial-osm-layer';

exports.up = function(done) {
  console.log('\nCreating open street map layer...');

  var osm = {
    name: "Open Street Map",
    type: "Imagery",
    format: "XYZ",
    base: true,
    url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  Layer.create(osm, done);
};

exports.down = function(next) {
  Layer.Model.remove({name: "Open Street Map"}, done);
};
