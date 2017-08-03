var async = require('async')
  , mongoose = require('mongoose')
  , Role = require('../models/role');

require('../models/user');
var UserModel = mongoose.model('User');

require('../models/team');
var TeamModel = mongoose.model('Team');

require('../models/event');
var EventModel = mongoose.model('Event');

exports.id = 'create-manager-role';

exports.up = function(done) {
  // Give existing ADMIN users 'OWNER' role in all events
  async.waterfall([
    createManagerRole,
    getAdminRole,
    getAdminUsers,
    function(users, done) {
      async.series([
        function(done) {
          addAdminUsersToTeamAcl(users, done);
        },
        function(done) {
          addAdminUsersToEventAcl(users, done);
        }
      ], function(err) {
        done(err);
      });
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
    'CREATE_OBSERVATION',
    'READ_OBSERVATION_EVENT',
    'CREATE_LOCATION',
    'READ_LOCATION_EVENT',
    'UPDATE_LOCATION_EVENT',
    'DELETE_LOCATION'
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

function getAdminRole(callback) {
  Role.getRole('ADMIN_ROLE', callback);
}

function getAdminUsers(adminRole, callback) {
  UserModel.find({roleId: adminRole._id}, callback);
}

function addAdminUsersToTeamAcl(users, callback) {
  var acl = [];
  users.forEach(function(user) {
    acl.push({
      role: 'OWNER',
      userId: user._id
    });
  });

  async.each(users, function(user, done) {
    TeamModel.update({}, {$set: {acl: acl}}, {multi: true}, done);
  }, callback);
}

function addAdminUsersToEventAcl(users, callback) {
  var acl = [];
  users.forEach(function(user) {
    acl.push({
      role: 'OWNER',
      userId: user._id
    });
  });

  async.each(users, function(user, done) {
    EventModel.update({}, {$set: {acl: acl}}, {multi: true}, done);
  }, callback);
}

exports.down = function(done) {
  Role.getRole("EVENT_MANAGER_ROLE", function(err, role) {
    if (err || !role) return done(err);

    Role.deleteRole(role, done);
  });
};
