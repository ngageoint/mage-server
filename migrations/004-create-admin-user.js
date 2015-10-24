var readline = require('readline')
  , async = require('async')
  , Role = require('../models/role')
  , User = require('../models/user');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

exports.id = 'create-initial-admin-user';

exports.up = function(done) {
  console.log('\nCreating intial admin user...');

  async.series({
      username: function(done) {
        var username = null;
        async.whilst(
          function() {
            return !username;
          },
          function (done) {
            rl.question('Please enter a username: ', function(answer) {
              username = answer
              done(null, username);
            });
          },
          function (err) {
            done(err, username);
          }
        );
      },
      p***REMOVED***word: function(done) {
        var p***REMOVED***word = null;
        async.whilst(
          function() {
            return !p***REMOVED***word;
          },
          function (done) {
            rl.question('Please enter a p***REMOVED***word: ', function(answer) {
              p***REMOVED***word = answer
              done(null, p***REMOVED***word);
            });
          },
          function (err) {
            done(err, p***REMOVED***word);
          }
        );
      },
  },
  function(err, results) {
    Role.getRole('ADMIN_ROLE', function(err, role) {
      if (err) return next(err);

      if (!role) return next(new Error('No ADMIN_ROLE found to attach to ADMIN_USER'));

      var adminUser = {
        username: results.username,
        p***REMOVED***word: results.p***REMOVED***word,
        displayName: results.username,
        roleId: role._id,
        active: 'true',
        authentication: {
          type: 'local',
          p***REMOVED***word: 'admin'
        }
      };

      User.createUser(adminUser, done);
    });
  });
};

exports.down = function(done) {
  done();
};
