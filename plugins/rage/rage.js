var async = require('async')
  , log = require('../../logger')
  , request = require('request')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , config = require('./config.json')
  , data = require('./data')
  , attachments = require('./attachments');

// setup mongoose to talk to mongodb
var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    log.info('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

var mongooseLogger = log.loggers.get('mongoose');
mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

function getToken(done) {
  log.info('getting token');

  var options = {
    url: config.url + '/api/login',
    json: {
      username: config.credentials.username,
      uid: config.credentials.uid,
      password: config.credentials.password
    }
  };

  request.post(options, function(err, res, body) {
    if (err) return done(err);
    if (res.statusCode !== 200) return done(new Error('Error hitting login api, respose code: ' + res.statusCode));
    done(null, body.token);
  });
}

function sync() {
  log.info('RAGEing....... ' + moment().toISOString());

  getToken(function(err, token) {
    if (err) log.error('error getting token', err);

    var series = [];
    if (token) {
      series = [
        function(done) {
          data.sync(token, done);
        },
        function(done) {
          attachments.sync(token, done);
        }
      ];
    }

    async.series(series, function(err) {
      if (err) log.error('RAGE error', err);
      log.info('RAGE over........ ' + moment().toISOString());
      setTimeout(sync, config.interval * 1000);
    });
  });
}

sync();
