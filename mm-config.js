var config = require('./config.js')
  , mongoose = require('mongoose')
  , log = require('winston');

var migrateConfig = {
  host: config.server.mongodb.host,
  port: config.server.mongodb.port,
  db: config.server.mongodb.db,
  collection: "migrations",
  directory: "migrations"
}

var mongoUri = "mongodb://" + migrateConfig.host + "/" + migrateConfig.db;
mongoose.connect(mongoUri, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

module.exports = migrateConfig;
