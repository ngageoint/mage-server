var environment = require('environment')
  , mongoose = require('mongoose')
  , log = require('winston');

var migrateConfig = {
  scheme: environment.mongo.scheme,
  host: environment.mongo.host,
  port: environment.mongo.port,
  db: environment.mongo.db,
  user: environment.mongo.username,
  password: environment.mongo.password,
  collection: "migrations",
  directory: "migrations"
};

var mongoUri = migrateConfig.scheme + "://" + migrateConfig.host + "/" + migrateConfig.db;
mongoose.connect(mongoUri, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

module.exports = migrateConfig;
