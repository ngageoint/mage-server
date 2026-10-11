const mongoose = require('mongoose');
const { CounterModel, MongooseSequenceRepository } = require('../adapters/counters/adapters.counters.db.mongoose');

/**
 * The Counter schema now lives in adapters/counters/adapters.counters.db.mongoose.ts.
 * Register it against the default connection the same way the old
 * self-registering schema did, so legacy code that looks the model up
 * directly by name keeps working.
 */
const counterModel = CounterModel(mongoose.connection);

/**
 * app.ts's initRepositories() overrides this with a MongooseSequenceRepository
 */
let sequenceRepo = new MongooseSequenceRepository(counterModel);

/**
 * This module is a thin bridge that keeps the legacy promise-based API
 * working for the handful of callers (migrations, api/layer.js) that have
 * not been migrated to the new SequenceRepository interface directly.
 */
exports.initialize = function (repos) {
  sequenceRepo = repos.sequenceRepo;
};

exports.getNext = function (collection) {
  return sequenceRepo.nextValue(collection);
};

exports.getGroup = function (collection, amount) {
  return sequenceRepo.nextValues(collection, amount);
};
