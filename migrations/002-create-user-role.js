var Role = require('../models/role');

exports.id = 'create-initial-user-role';

exports.up = function(done) {

  var userPermissions = [
    'READ_DEVICE',
    'READ_EVENT',
    'READ_TEAM',
    'READ_LAYER',
    'READ_USER',
    'READ_ROLE',
    'CREATE_FEATURE', 'READ_FEATURE', 'UPDATE_FEATURE', 'DELETE_FEATURE',
    'CREATE_LOCATION', 'READ_LOCATION', 'UPDATE_LOCATION', 'DELETE_LOCATION'];

  var userRole = {
    name: "USER_ROLE",
    description: "User role, limited acces to MAGE API.",
    permissions: userPermissions
  };

  Role.createRole(userRole, done);
};

exports.down = function(done) {
  Role.getRole("USER_ROLE", function(err, role) {
    if (err || !role) return done(err);

    Role.deleteRole(role, done);
  });
};
