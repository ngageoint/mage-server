const
environment = require('./environment/env'),

const mongo = environment.mongo;
const migrateConfig = {
  url: mongo.uri,
  collection: "migrations",
  directory: "migrations",
  options: mongo.options
};

module.exports = migrateConfig;
