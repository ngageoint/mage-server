var Layer = require('../models/layer');

exports.id = 'create-initial-feature-layer';

exports.up = function(done) {
  var osm = {
    name: "Field Observations",
    type: "Feature"
  };

  Layer.create(osm, done);
};

exports.down = function(done) {
  Layer.Model.remove({name: "Field Observations", type: "Feature"}, done);
};
