const mongoose = require('mongoose');
const { LayerModel, MongooseLayerRepository } = require('../adapters/layers/adapters.layers.db.mongoose');
const { createFeatureCollection, dropFeatureCollection } = require('../adapters/features/adapters.features.db.mongoose');
const { MongooseSequenceRepository, CounterModel } = require('../adapters/counters/adapters.counters.db.mongoose');

const layerModel = LayerModel(mongoose.connection);

function defaultRemoveLayerFromEvents(layerId) {
  return new Promise((resolve, reject) => {
    require('./event').removeLayerFromEvents({ _id: layerId }, (err) => err ? reject(err) : resolve());
  });
}

let layerRepo = new MongooseLayerRepository(
  layerModel,
  new MongooseSequenceRepository(CounterModel(mongoose.connection)),
  defaultRemoveLayerFromEvents
);

/**
 * This module is a thin bridge that keeps the legacy API working for
 * api/layer.js, the only caller that has not been migrated to the new
 * LayerRepository interface directly.
 */
exports.initialize = function (repos) {
  layerRepo = repos.layerRepo;
};

exports.getLayers = function (filter) {
  return layerRepo.findMany(filter || {});
};

exports.count = function () {
  return layerRepo.count();
};

exports.getById = function (id) {
  return layerRepo.findById(id);
};

exports.nextLayerId = function () {
  return layerRepo.nextLayerId();
};

exports.createFeatureCollection = function (name) {
  return createFeatureCollection(mongoose.connection, name);
};

exports.dropFeatureCollection = function (layer) {
  return dropFeatureCollection(mongoose.connection, layer.collectionName);
};

exports.create = function (id, layer) {
  return layerRepo.create(id, layer);
};

exports.update = function (id, layer) {
  return layerRepo.update(id, layer);
};

exports.remove = function (layer) {
  return layerRepo.remove(layer);
};
