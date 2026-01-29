const async = require('async');
const log = require('../../logger'); // centralized logger
const request = require('request');
const mongoose = require('mongoose');
const moment = require('moment');
const config = require('./config.json');
const data = require('./data');
const attachments = require('./attachments');

// setup mongoose to talk to mongodb
const mongodbConfig = config.mongodb;
mongoose.connect(
  mongodbConfig.url,
  { server: { poolSize: mongodbConfig.poolSize } },
  function(err) {
    if (err) {
      log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
      throw err;
    }
  }
);

// 🔹 FIXED: use your new mongooseLogger
const { mongooseLogger } = require('../../logger');

mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.debug("%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

function getToken(done) {
  log.info('getting token');

  const options = {
    url: config.url + '/api/login',
    json: {
      username: config.credentials.username,
      uid: config.credentials.uid,
      password: config.credentials.password
    }
  };

  request.post(options, function(err, res, body) {
    if (err) return done(err);
    if (res.statusCode !== 200) return done(new Error('Error hitting login api, response code: ' + res.statusCode));
    done(null, body.token);
  });
}

function sync() {
  log.info('RAGEing....... ' + moment().toISOString());

  getToken(function(err, token) {
    if (err) log.error('error getting token', err);

    let series = [];
    if (token) {
      series = [
        function(done) { data.sync(token, done); },
        function(done) { attachments.sync(token, done); }
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
