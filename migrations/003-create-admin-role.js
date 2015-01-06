var  Role = require('../models/role');

exports.id = 'create-initial-admin-role';

exports.up = function(done) {

  var adminPermissions = [
    'CREATE_DEVICE', 'READ_DEVICE', 'UPDATE_DEVICE', 'DELETE_DEVICE',
    'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'DELETE_USER',
    'CREATE_ROLE', 'READ_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
    'CREATE_LAYER', 'READ_LAYER', 'UPDATE_LAYER', 'DELETE_LAYER',
    'CREATE_FEATURE', 'READ_FEATURE', 'UPDATE_FEATURE', 'DELETE_FEATURE',
    'CREATE_LOCATION', 'READ_LOCATION', 'UPDATE_LOCATION', 'DELETE_LOCATION',
    'CREATE_TEAM', 'READ_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM'];

  var adminRole = {
    name: "ADMIN_ROLE",
    description: "Administrative role, full acces to entire MAGE API.",
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
