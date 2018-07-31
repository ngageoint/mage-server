var FeatureModel = require('../models/feature');

class Feature {
  constructor(layer) {
    this._layer = layer;
  }

  getAll() {
    return FeatureModel.getFeatures(this._layer);
  }

  createFeatures(features) {
    return FeatureModel.createFeatures(this._layer, features);
  }
}

module.exports = Feature;
