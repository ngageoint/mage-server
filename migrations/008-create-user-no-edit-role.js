var Role = require('../models/role');

exports.id = 'create-user-no-edit-role';

exports.up = function(done) {
  console.log('\nCreating user no edit role...');

  var userPermissions = [
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

  var userNoEditRole = {
    name: "USER_NO_EDIT_ROLE",
    description: "User no edit role, location and observation creation only acces to MAGE API.",
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
