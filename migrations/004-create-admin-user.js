var Role = require('../models/role')
  , User = require('../models/user');

exports.id = 'create-initial-admin-user';

exports.up = function(done) {
  var p***REMOVED***word = 'admin';
  Role.getRole('ADMIN_ROLE', function(err, role) {
    if (err) return next(err);

    if (!role) return next(new Error('No ADMIN_ROLE found to attach to ADMIN_USER'));

    var adminUser = {
      active: 'true',
      username: 'admin',
      p***REMOVED***word: 'admin',
      displayName: 'admin admin',
      roleId: role._id,
      authentication: {
        type: 'local',
        p***REMOVED***word: 'admin'
      }
    };

    User.createUser(adminUser, done);
  });
};

exports.down = function(done) {
  User.getUserByUsername('admin', function(err, user) {
    if (err || !user) return done(err);

    User.deleteUser(user, done);
  });
};
