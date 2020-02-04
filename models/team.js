var mongoose = require('mongoose')
  , async = require('async')
  , Event = require('./event')
  , userTransformer = require('../transformers/user');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold users
var TeamSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  teamEventId: { type: Number, ref: 'Event' },
  userIds: [{type: Schema.Types.ObjectId, ref: 'User'}],
  acl: {}
},{
  minimize: false
});

var permissions = {
  OWNER: ['read', 'update', 'delete'],
  MANAGER: ['read', 'update'],
  GUEST: ['read']
};

function rolesWithPermission(permission) {
  var roles = [];

  for (var key in permissions) {
    if (permissions[key].indexOf(permission) !== -1) {
      roles.push(key);
    }
  }

  return roles;
}

TeamSchema.pre('remove', function(next) {
  var team = this;

  if (!team.teamEventId) return next();

  Event.getById(team.teamEventId, function(err, event) {
    if (err) return next(err);

    if (event) {
      var error = new Error("Cannot delete an events team, event '" + event.name + "' still exists.");
      error.status = 405;
      return next(error);
    }

    return next();
  });
});

TeamSchema.pre('remove', function(next) {
  var team = this;
  Event.removeTeamFromEvents(team, next);
});

function transform(team, ret, options) {
  ret.id = ret._id;
  delete ret._id;

  if (team.populated('userIds')) {
    ret.users = userTransformer.transform(ret.userIds, {path: options.path});
    delete ret.userIds;
  }

  // if read only permissions in team acl, then return users acl
  if (options.access) {
    var userAccess = ret.acl[options.access.user._id];
    var roles = rolesWithPermission('update').concat(rolesWithPermission('delete'));
    if (!userAccess || roles.indexOf(userAccess) === -1) {
      var acl = {};
      acl[options.access.user._id] = ret.acl[options.access.user._id];
      ret.acl = acl;
    }
  }

  for (var userId in ret.acl) {
    ret.acl[userId] = {
      role: ret.acl[userId],
      permissions: permissions[ret.acl[userId]]
    };
  }
}

TeamSchema.set("toObject", {
  transform: transform
});

TeamSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the User Schema
var Team = mongoose.model('Team', TeamSchema);
exports.TeamModel = Team;

exports.userHasAclPermission = function(team, userId, permission) {
  return team.acl[userId] && rolesWithPermission(permission).some(function(role) {
    return role === team.acl[userId];
  });
};

exports.getTeamById = function(id, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {
    _id: id
  };
  if (options.access) {
    var accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    rolesWithPermission(options.access.permission).forEach(function(role) {
      var access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    conditions['$or'] = accesses;
  }

  Team.findOne(conditions).populate('userIds').exec(callback);
};

exports.teamsForUserInEvent = function(user, event, callback) {
  var conditions = {
    _id: {$in: event.teamIds},
    userIds: user._id
  };
  Team.find(conditions, function(err, teams) {
    callback(err, teams);
  });
};

exports.count = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};
  if (options.access) {
    var accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];
    rolesWithPermission(options.access.permission).forEach(function(role) {
      var access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    conditions['$or'] = accesses;
  }

  Team.count(conditions, function(err, count) {
    callback(err, count);
  });
};

exports.getTeams = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};
  if (options.teamIds) {
    conditions._id = {
      $in: options.teamIds
    };
  }

  if (options.userId) {
    conditions.userIds = {
      '$in': [options.userId]
    };
  }

  if (options.access) {
    var accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    rolesWithPermission(options.access.permission).forEach(function(role) {
      var access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    conditions['$or'] = accesses;
  }

  Team.find(conditions).populate('userIds').exec(function (err, teams) {
    callback(err, teams);
  });
};

exports.createTeam = function(team, user, callback) {
  var create = {
    name: team.name,
    description: team.description
  };

  if (team.users) {
    create.userIds = team.users.map(function(user) { return mongoose.Types.ObjectId(user.id); });
  }

  create.acl = {};
  create.acl[user._id.toString()] = 'OWNER';

  Team.create(create, function(err, team) {
    if (err) return callback(err);

    Team.populate(team, {path: 'userIds'}, callback);
  });
};

exports.createTeamForEvent = function(event, user, callback) {
  async.waterfall([
    function(done) {
      var team = {
        name: event.name,
        description: "This team belongs specifically to event '" + event.name + "' and cannot be deleted.",
        teamEventId: event._id,
        acl: {}
      };

      team.acl[user._id.toString()] = 'OWNER';

      Team.create(team, done);
    },
    function(team, done) {
      Event.addTeam(event, {id: team._id }, function(err) {
        done(err, team);
      });
    }
  ], function(err, team) {
    if (err) return callback(err);

    Team.populate(team, {path: 'userIds'}, callback);
  });
};

// TODO: should this do something with ACL?
exports.updateTeam = function(id, update, callback) {
  if (update.users) {
    update.userIds = update.users.map(function(user) { return mongoose.Types.ObjectId(user.id); });
  }

  Team.findByIdAndUpdate(id, update, {new: true, populate: 'userIds'}, callback);
};

exports.deleteTeam = function(team, callback) {
  team.remove(function(err) {
    callback(err, team);
  });
};

exports.addUser = function(team, user, callback) {
  var update = {
    $addToSet: {
      userIds: mongoose.Types.ObjectId(user.id)
    }
  };

  Team.findByIdAndUpdate(team._id, update, function(err, team) {
    callback(err, team);
  });
};

exports.removeUser = function(team, user, callback) {
  var update = {
    $pull: {
      userIds: { $in: [mongoose.Types.ObjectId(user.id)] }
    }
  };

  Team.findByIdAndUpdate(team._id, update, function(err, team) {
    callback(err, team);
  });
};

exports.updateUserInAcl = function(teamId, userId, role, callback) {
  // validate userId
  var err;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    err = new Error('Invalid userId');
    err.status = 400;
    return callback(err);
  }

  // validate role
  if (Object.keys(permissions).indexOf(role) === -1) {
    err = new Error('Invalid role');
    err.status = 400;
    return callback(err);
  }

  var update = {};
  update['acl.' + userId.toString()] = role;

  Team.findOneAndUpdate({_id: teamId}, update, {new: true}, callback);
};

exports.updateUserInAclForEventTeam = function(eventId, userId, role, callback) {
  var update = {};
  update['acl.' + userId.toString()] = role;

  Team.findOneAndUpdate({teamEventId: eventId}, update, {new: true}, callback);
};

exports.removeUserFromAcl = function(teamId, userId, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + userId.toString()] = true;

  Team.findByIdAndUpdate(teamId, update, {new: true}, callback);
};

exports.removeUserFromAclForEventTeam = function(eventId, userId, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + userId.toString()] = true;

  Team.findOneAndUpdate({teamEventId: eventId}, update, {new: true}, callback);
};

exports.removeUserFromAllAcls = function(user, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + user._id.toString()] = true;

  Team.update({}, update, {multi: true, new: true}, callback);
};

/*
Get a team based on event id.  This will return the team 
directly associated with the event.
*/
exports.getTeamByEventId = function(eventId) {
  var conditions = {};
  if (eventId) {
    conditions.teamEventId = {
      '$eq': eventId
    };
  }

  const promise = new Promise(function(resolve, reject) {
    Team.findOne(conditions)
      .exec()
      .then(team => {
        resolve(team ? team : undefined);
      })
      .catch(err => reject(err));
  });

  return promise;
};

exports.addUserWithPromise = function(team, user) {
  var update = {
    $addToSet: {
      userIds: mongoose.Types.ObjectId(user.id)
    }
  };

  const promise = new Promise(function(resolve, reject) {
    Team.findByIdAndUpdate(team._id, update)
      .exec()
      .then(team => {
        resolve(team ? team : undefined);
      })
      .catch(err => reject(err));
  });

  return promise;
};
