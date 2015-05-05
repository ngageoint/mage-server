var async = require('async')
  , request = require('request')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , config = require('./config')
  , data = require('./data')
  , attachments = require('./attachments');

// setup mongoose to talk to mongodb
var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});
mongoose.set('debug', false);

function getToken(done) {
  console.log('getting token');

  var options = {
    url: config.url + '/api/login',
    json: {
      username: config.credentials.username,
      uid: config.credentials.uid,
      p***REMOVED***word: config.credentials.p***REMOVED***word
    }
  };

  request.post(options, function(err, res, body) {
    if (err) return done(err);
    if (res.statusCode != 200) return done(new Error('Error hitting login api, respose code: ' + res.statusCode));
    done(null, body.token);
  });
}

function sync() {
  console.log('RAGEing....... ' + moment().toISOString());

  getToken(function(err, token) {
    if (err) console.log('error getting token', err);

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
      if (err) console.log('RAGE error', err);
      console.log('RAGE over........ ' + moment().toISOString());
      setTimeout(sync, config.interval * 1000);
    });
  });
};

sync();
