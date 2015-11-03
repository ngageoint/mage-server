var readline = require('readline')
  , async = require('async')
  , Device = require('../models/device');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});
var defaultDescription = 'Initial device for web console';

exports.id = 'create-initial-device';

exports.up = function(done) {
  console.log('\nCreating initial device uid...');

  async.series({
      uid: function(done) {
        var uid = null;
        async.whilst(
          function() {
            return !uid;
          },
          function (done) {
            rl.question('Please enter a uid, this is what you will use to login to the web: ', function(answer) {
              if (answer) uid = answer;
              done(null, uid);
            });
          },
          function (err) {
            done(err, uid);
          }
        );
      },
      description: function(done) {
        rl.question('Please enter a description (' + defaultDescription + '):  ', function(description) {
          if (!description) description = defaultDescription;
          done(null, description);
        });
      }
  },
  function(err, results) {
    var device = {
      name: results.name,
      uid: results.uid,
      registered: true,
      description: results.description
    };

    Device.createDevice(device, done);
  });
};

exports.down = function(done) {
  done();
};
