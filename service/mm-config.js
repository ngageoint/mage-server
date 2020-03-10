const path = require('path');
const environment = require('./environment/env');

const mongo = environment.mongo;
const migrateConfig = {
  url: mongo.uri,
  collection: "migrations",
  directory: path.resolve(__dirname, "migrations"),
  options: mongo.options
};

module.exports = migrateConfig;
