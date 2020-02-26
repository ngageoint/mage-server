var async = require('async')
  , mongoose = require('mongoose');

require('../models/role');
var RoleModel = mongoose.model('Role');

exports.id = 'add-user-device-manager-role';

exports.up = function(done) {
  async.series([
    createManagerRole,
  ], function(err) {
    done(err);
  });
};

function createManagerRole(callback) {
  var userPermissions = [
    'CREATE_EVENT',
    'CREATE_TEAM',
    'READ_TEAM',
    'READ_DEVICE', 'UPDATE_DEVICE',
    'READ_LAYER_ALL',
    'READ_USER', 'UPDATE_USER',
    'READ_ROLE',
    'CREATE_OBSERVATION', 'READ_OBSERVATION_EVENT', 'UPDATE_OBSERVATION_EVENT', 'DELETE_OBSERVATION',
    'CREATE_LOCATION', 'READ_LOCATION_EVENT', 'UPDATE_LOCATION_EVENT', 'DELETE_LOCATION'
  ];

  var managerRole = {
    name: 'EVENT_MANAGER_ROLE',
    description: 'Role which allows user to manage teams and events.',
    permissions: userPermissions
  };

  console.log('Update event/team manager role to add user and device edit permissions...');
  RoleModel.update({name: 'EVENT_MANAGER_ROLE'}, managerRole, function(err) {
    callback(err);
  });
}

exports.down = function(done) {
  done();
};
