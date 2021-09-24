const Role = require('../models/role');

exports.id = 'create-user-no-edit-role';

exports.up = function(done) {
  this.log('creating user no edit role...');

  const userPermissions = [
    "READ_DEVICE",
    "READ_EVENT_USER",
    "READ_TEAM",
    "READ_LAYER_EVENT",
    "READ_USER",
    "READ_ROLE",
    "CREATE_OBSERVATION",
    "READ_OBSERVATION_EVENT",
    "CREATE_LOCATION",
    "READ_LOCATION_EVENT",
    "UPDATE_LOCATION_EVENT",
    "DELETE_LOCATION"
  ];

  const userNoEditRole = {
    name: "USER_NO_EDIT_ROLE",
    description: "This role grants permission to create locations and observations, but denies permission to edit them.",
    permissions: userPermissions
  };

  Role.createRole(userNoEditRole, done);
};

exports.down = function(done) {
  Role.getRole("USER_NO_EDIT_ROLE", function(err, role) {
    if (err || !role) return done(err);

    Role.deleteRole(role, done);
  });
};
