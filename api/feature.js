var FeatureModel = require('../models/feature');

function Feature(layer) {
  this._layer = layer;
};

Feature.prototype.getAll = function(callback) {
  FeatureModel.getFeatures(this._layer, callback);
}

Feature.prototype.createFeatures = function(features, callback) {
  FeatureModel.createFeatures(this._layer, features, function(err, newFeatures) {
    callback(err, newFeatures);
  });
}

module.exports = Feature;
