var async = require('async')
  , mongoose = require('mongoose')
  , Role = require('../models/role');

require('../models/team');
var TeamModel = mongoose.model('Team');

require('../models/event');
var EventModel = mongoose.model('Event');

exports.id = 'create-manager-role';

exports.up = function(done) {
  async.series([
    createManagerRole,
    function(done) {
      TeamModel.update({}, {$set: {acl: {}}}, {multi: true}, done);
    },
    function(done) {
      EventModel.update({}, {$set: {acl: {}}}, {multi: true}, done);
    }
  ], function(err) {
    done(err);
  });
};

function createManagerRole(callback) {
  var userPermissions = [
    'CREATE_EVENT',
    'CREATE_TEAM',
    'READ_TEAM',
    'READ_DEVICE',
    'READ_LAYER_ALL',
    'READ_USER',
    'READ_ROLE',
    'CREATE_OBSERVATION', 'READ_OBSERVATION_EVENT', 'UPDATE_OBSERVATION_EVENT', 'DELETE_OBSERVATION',
    'CREATE_LOCATION', 'READ_LOCATION_EVENT', 'UPDATE_LOCATION_EVENT', 'DELETE_LOCATION'
  ];

  var managerRole = {
    name: "EVENT_MANAGER_ROLE",
    description: "Role which allows user to manage teams and events.",
    permissions: userPermissions
  };

  console.log('\nCreating event/team manager role...');
  Role.createRole(managerRole, function(err) {
    callback(err);
  });
}

exports.down = function(done) {
  Role.getRole("EVENT_MANAGER_ROLE", function(err, role) {
    if (err || !role) return done(err);

    Role.deleteRole(role, done);
  });
};
