// Setup mongoose
var mongoose = require('mongoose')
  , Layer = require('../models/layer')
  , server = require('../config').server;

exports.up = function(next) {
  mongoose.connect(server.mongodb.url);

  var osm = {
    name: "Field Observations",
    type: "Feature"
  };

  Layer.create(osm, function(err, layer) {
    return next(err);
  });
};

exports.down = function(next) {
  mongoose.connect(server.mongodb.url);

  Layer.Model.remove({name: "Field Observations", type: "Feature"}, function(err) {
    return next(err);
  });
};
