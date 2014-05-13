// Setup mongoose
var mongoose = require('mongoose')
  , Layer = require('../models/layer')
  , server = require('../config').server;

exports.up = function(next) {
  mongoose.connect(server.mongodb.url);

  var osm = {
    name: "Open Street Map",
    type: "Imagery",
    format: "XYZ",
    base: true,
    url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  Layer.create(osm, function(err, layer) {
    return mongoose.disconnect(next);
  });
};

exports.down = function(next) {
  mongoose.connect(server.mongodb.url);

  Layer.Model.remove({name: "Open Street Map"}, function(err) {
    return mongoose.disconnect(next);
  });
};