const 
environment = require('./environment/env'),
mongoose = require('mongoose');

const mongo = environment.mongo;
const migrateConfig = {
  url: mongo.uri,
  collection: "migrations",
  directory: "migrations",
  options: mongo.options
};

module.exports = migrateConfig;
