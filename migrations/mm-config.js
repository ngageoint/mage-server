var environment = require('environment')
  , mongoose = require('mongoose')
  , log = require('winston');

var mongo = environment.mongo;

var migrateConfig = {
  scheme: environment.mongo.scheme,
  host: environment.mongo.host,
  port: environment.mongo.port,
  db: environment.mongo.db,
  user: environment.mongo.username,
  password: environment.mongo.password,
  collection: "migrations",
  directory: "migrations",
  options: environment.mongo.options
};

log.info('using mongodb connection from: ' + mongo.uri);
mongoose.Promise = require('bluebird');
mongoose.connect(environment.mongo.uri, environment.mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

module.exports = migrateConfig;
