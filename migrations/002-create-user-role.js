var Role = require('../models/role');

exports.id = 'create-initial-user-role';

exports.up = function(done) {
  console.log('\nCreating user role...');

  var userPermissions = [
    'READ_DEVICE',
    'READ_EVENT_USER',
    'READ_TEAM',
    'READ_LAYER_EVENT',
    'READ_USER',
    'READ_ROLE',
    'CREATE_OBSERVATION', 'READ_OBSERVATION_EVENT', 'UPDATE_OBSERVATION_EVENT', 'DELETE_OBSERVATION',
    'CREATE_LOCATION', 'READ_LOCATION_EVENT', 'UPDATE_LOCATION_EVENT', 'DELETE_LOCATION'];

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
