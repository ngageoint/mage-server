const Role = require('../models/role');

exports.id = 'create-initial-user-role';

exports.up = function(done) {
  this.log('creating user role...');

  const userPermissions = [
    'READ_DEVICE',
    'READ_EVENT_USER',
    'READ_TEAM',
    'READ_LAYER_EVENT',
    'READ_USER',
    'READ_ROLE',
    'CREATE_OBSERVATION', 'READ_OBSERVATION_EVENT', 'UPDATE_OBSERVATION_EVENT', 'DELETE_OBSERVATION',
    'CREATE_LOCATION', 'READ_LOCATION_EVENT', 'UPDATE_LOCATION_EVENT', 'DELETE_LOCATION'];

  const userRole = {
    name: "USER_ROLE",
    description: "The user role permits access to the event-based, observation collection and query functions, but denies permission to administrative funtions.",
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
