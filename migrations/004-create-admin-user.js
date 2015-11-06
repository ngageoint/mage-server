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
      password: function(done) {
        var password = null;
        async.whilst(
          function() {
            return !password;
          },
          function (done) {
            rl.question('Please enter a password: ', function(answer) {
              password = answer
              done(null, password);
            });
          },
          function (err) {
            done(err, password);
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
        displayName: results.username,
        roleId: role._id,
        active: 'true',
        authentication: {
          type: 'local',
          password: results.password
        }
      };

      User.createUser(adminUser, done);
    });
  });
};

exports.down = function(done) {
  done();
};
