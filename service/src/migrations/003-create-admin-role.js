const  Role = require('../models/role');

exports.id = 'create-initial-admin-role';

exports.up = function(done) {
  this.log('creating admin role...');

  const adminPermissions = [
    'READ_SETTINGS', 'UPDATE_SETTINGS',
    'CREATE_DEVICE', 'READ_DEVICE', 'UPDATE_DEVICE', 'DELETE_DEVICE',
    'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'DELETE_USER',
    'CREATE_ROLE', 'READ_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
    'CREATE_EVENT', 'READ_EVENT_ALL', 'UPDATE_EVENT', 'DELETE_EVENT',
    'CREATE_LAYER', 'READ_LAYER_ALL', 'UPDATE_LAYER', 'DELETE_LAYER',
    'CREATE_OBSERVATION', 'READ_OBSERVATION_ALL', 'UPDATE_OBSERVATION_ALL', 'DELETE_OBSERVATION',
    'CREATE_LOCATION', 'READ_LOCATION_ALL', 'UPDATE_LOCATION_ALL', 'DELETE_LOCATION',
    'CREATE_TEAM', 'READ_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM'];

  const adminRole = {
    name: "ADMIN_ROLE",
    description: "The administrative role grants permission to perform all MAGE functions.",
    permissions: adminPermissions
  };

  Role.createRole(adminRole, done);
};

exports.down = function(done) {

  Role.getRole("ADMIN_ROLE", function(err, role) {
    if (err || !role) return done(err);

    Role.deleteRole(role, done);
  });
};
