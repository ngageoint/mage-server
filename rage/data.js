module.exports = function(config) {
  var async = require('async')
    , restler = require('restler')
    , sleep = require('sleep');

  var syncUsers = function() {
  }

  var syncDevices = function() {
  }

  var syncLayers = function() {
  }

  var syncFeatures = function(layer) {
  }

  // TODO need to encrypt these
  var username = 'admin';
  var p***REMOVED***word = 'admin';
  var uid = 12345;

  var token;

  while(true) {
    console.log('pulling data');

    async.series({
      token: function(done) {
        done(null, 1);
      },
      users: function(done) {
        done(null, 1);
      },
      devices: function(done) {
        done(null, 2);
      },
      layers: function(done) {
        done(null, 2);
      }
    },
    function(err, results) {
      // results is now equal to: {token: 1, users: 2, etc...}
    });


    sleep.sleep(config.timeout);
  }
}