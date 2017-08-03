var mongoose = require('mongoose')
  , async = require('async')
  , Event = require('./event');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var AccessSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  role: { type: String, enum: ['OWNER', 'MANAGER', 'GUEST'], required: false }
}, {
  _id: false
});

// Collection to hold users
var TeamSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  teamEventId: { type: Number, ref: 'Event' },
  userIds: [{type: Schema.Types.ObjectId, ref: 'User'}],
  acl: [AccessSchema]
},{
  versionKey: false
});

function hasAtLeastOneOwner(acl) {
  return acl.filter(function(access) {
    return access.role === 'OWNER';
  }).length > 0;
}

TeamSchema.path('acl').validate(hasAtLeastOneOwner, 'Team must have at least "Owner"');

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
    ret.users = ret.userIds;
    delete ret.userIds;
  }

  // if read only permissions in team acl, then return users acl
  if (options.access) {
    var userAccess = ret.acl.filter(function(access) {
      return access.userId.toString() === options.access.user._id.toString();
    })[0] || null;

    var roles = rolesWithPermission('update').concat(rolesWithPermission('delete'));
    if (!userAccess || roles.indexOf(userAccess.role) === -1) {
      ret.acl = ret.acl.filter(function(access) {
        return access.userId.toString() === options.access.user._id.toString();
      });
    }
  }

  ret.acl.forEach(function(access) {
    access.permissions = permissions[access.role];
  });
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
  // Check if user has permission in team acl
  var roles = rolesWithPermission(permission);
  if (team.acl.some(function(access) { return access.userId.toString() === userId.toString() && roles.indexOf(access.role) !== -1; })) {
    return true;
  }

  return false;
};

// TODO is user in team, then they have 'read' access
exports.getTeamById = function(id, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {
    _id: id
  };
  if (options.access) {
    var roles = rolesWithPermission(options.access.permission);
    var accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    roles.forEach(function(role) {
      accesses.push({
        acl: {
          $elemMatch: {
            userId: options.access.user._id,
            role: role
          }
        }
      });
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
    var roles = rolesWithPermission(options.access.permission);
    var accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];
    roles.forEach(function(role) {
      accesses.push({
        acl: {
          $elemMatch: {
            userId: options.access.user._id,
            role: role
          }
        }
      });
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
    var roles = rolesWithPermission(options.access.permission);
    var accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];
    roles.forEach(function(role) {
      accesses.push({
        acl: {
          $elemMatch: {
            userId: options.access.user._id,
            role: role
          }
        }
      });
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

  create.acl = [{
    userId: user._id,
    role: 'OWNER'
  }];

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
        acl: [{
          role: 'OWNER',
          userId: user._id
        }]
      };

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

exports.updateTeam = function(id, update, callback) {
  if (update.users) {
    update.userIds = update.users.map(function(user) { return mongoose.Types.ObjectId(user.id); });
  }

  Team.findByIdAndUpdate(id, update, {new: true}, function(err, team) {
    Team.populate(team, {path: 'userIds'}, callback);
  });
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

exports.updateUserInAcl = function(team, userId, role, callback) {
  console.log('update acl for team')
  var access = team.acl.filter(function(access) {
    return access.userId.toString() === userId.toString();
  });

  if (access.length) {
    access = access[0];
    access.role = role;
  } else {
    team.acl.push({
      userId: userId,
      role: role
    });
  }

  team.markModified('acl');
  team.save(callback);
};

exports.updateUserInAclForEventTeam = function(event, userId, role, callback) {
  Team.findOne({teamEventId: event._id}, function(err, team) {
    if (err || !team) return callback(err);

    exports.updateUserInAcl(team, userId, role, callback);
  });
};

exports.removeUserFromAcl = function(team, userId, callback) {
  var acl = team.acl.filter(function(access) {
    return access.userId.toString() !== userId.toString();
  });

  team.acl = acl;
  team.markModified('acl');
  team.save(callback);
};

exports.removeUserFromAclForEventTeam = function(event, userId, callback) {
  Team.findOne({teamEventId: event._id}, function(err, team) {
    if (err || !team) return callback(err);

    exports.removeUserFromAcl(team, userId, callback);
  });
};
