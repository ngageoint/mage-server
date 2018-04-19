var environment = require('environment')
  , mongoose = require('mongoose')
  , log = require('winston');

var migrateConfig = {
  host: environment.mongo.host,
  port: environment.mongo.port,
  db: environment.mongo.db,
  ssl: environment.mongo.ssl,
  user: environment.mongo.username,
  password: environment.mongo.password,
  collection: 'migrations',
  directory: 'migrations',
  server: {
    options: environment.mongo.options
  }
};

mongoose.connect(environment.mongo.uri, environment.mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodb is running...');
    throw err;
  }
});

module.exports = migrateConfig;
