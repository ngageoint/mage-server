const mongoose = require('mongoose');
const { FeatureModel, MongooseFeatureRepository } = require('../adapters/features/adapters.features.db.mongoose');

/**
 * The Feature schema now lives in adapters/features/adapters.features.db.mongoose.ts
 */
function repositoryForLayer(layer) {
  const model = FeatureModel(mongoose.connection, layer.collectionName);
  return new MongooseFeatureRepository(model);
}

exports.featureModel = function (layer) {
  return FeatureModel(mongoose.connection, layer.collectionName);
};

exports.getFeatures = function (layer) {
  return repositoryForLayer(layer).findAll();
};

exports.createFeatures = function (layer, features) {
  return repositoryForLayer(layer).createMany(features);
};
