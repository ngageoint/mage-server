const async = require('async')
  , mongoose = require('mongoose')
  , Role = require('../models/role');

require('../models/team');
const TeamModel = mongoose.model('Team');

require('../models/event');
const EventModel = mongoose.model('Event');

function createManagerRole(callback) {
  const userPermissions = [
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

  const managerRole = {
    name: "EVENT_MANAGER_ROLE",
    description: "The event manager role permits users to manage teams and events.",
    permissions: userPermissions
  };

  this.log('creating event/team manager role...');
  Role.createRole(managerRole, function(err) {
    callback(err);
  });
}

exports.id = 'create-manager-role';

exports.up = function(done) {
  async.series([
    createManagerRole.bind(this),
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

exports.down = function(done) {
  Role.getRole("EVENT_MANAGER_ROLE", function(err, role) {
    if (err || !role) return done(err);

    Role.deleteRole(role, done);
  });
};
