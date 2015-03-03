var mongoose = require('mongoose')
  , async = require("async")
  , hasher = require('../utilities/pbkdf2')()
  , Token = require('../models/token')
  , Observation = require('../models/observation');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var PhoneSchema = new Schema({
  type: { type: String, required: true },
  number: { type: String, required: true }
},{
  versionKey: false,
  _id: false
});

// Collection to hold users
var UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    p***REMOVED***word: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: {type: String, required: true },
    email: {type: String, required: false },
    phones: [PhoneSchema],
    avatar: {
      contentType: { type: String, required: false },
      size: { type: Number, required: false },
      relativePath: { type: String, required: false }
    },
    icon: {
      contentType: { type: String, required: false },
      size: { type: Number, required: false },
      relativePath: { type: String, required: false }
    },
    active: { type: Boolean, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    status: { type: String, required: false, index: 'sparse' },
    recentEventIds: [{type: Number, ref: 'Event'}],
    userAgent: {type: String, required: false },  // TODO move this to device, store last 10 device ids here instead
    mageVersion: {type: String, required: false } // TODO move this to device
  },{
    versionKey: false
  }
);

UserSchema.method('validP***REMOVED***word', function(p***REMOVED***word, callback) {
  var user = this;
  hasher.validP***REMOVED***word(p***REMOVED***word, user.p***REMOVED***word, callback);
});

// Lowercase the username we store, this will allow for case insensitive usernames
// Validate that username does not already exist
UserSchema.pre('save', function(next) {
  var user = this;
  user.username = user.username.toLowerCase();
  User.findOne({username: user.username}, function(err, possibleDuplicate) {
    if (err) return next(err);

    if (possibleDuplicate && !possibleDuplicate._id.equals(user._id)) {
      return next(new Error('username already exists'));
    }

    next();
  });
});

// Encrypt p***REMOVED***word before save
UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the p***REMOVED***word if it has been modified (or is new)
  if (!user.isModified('p***REMOVED***word')) {
    return next();
  }

  hasher.encryptP***REMOVED***word(user.p***REMOVED***word, function(err, encryptedP***REMOVED***word) {
    if (err) return next(err);

    user.p***REMOVED***word = encryptedP***REMOVED***word;
    next();
  });
});

// Remove Token if p***REMOVED***word changed
UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the p***REMOVED***word if it has been modified (or is new)
  if (!user.isModified('p***REMOVED***word')) {
    return next();
  }

  Token.removeTokensForUser(user, function(err) {
    if (err) return next(err);

    next();
  });
});

UserSchema.pre('remove', function(next) {
  var user = this;

  async.parallel({
    token: function(done) {
      Token.removeTokensForUser(user, function(err) {
        done(err);
      });
    },
    observation: function(done) {
      Observation.removeUser(user, function(err) {
        done(err);
      });
    }
  },
  function(err, results) {
    next(err);
  });
});

var transform = function(user, ret, options) {
  if ('function' != typeof user.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;

    delete ret.p***REMOVED***word;
    delete ret.avatar;
    delete ret.icon;

    if (user.populated('roleId')) {
      ret.role = ret.roleId;
      delete ret.roleId;
    }

    if (user.avatar && user.avatar.relativePath) {
      // TODO, don't really like this, need a better way to set user resource, route
      ret.avatarUrl = [(options.path ? options.path : ""), "api", "users", user._id, "avatar"].join("/");
    }

    if (user.icon && user.icon.relativePath) {
      // TODO, don't really like this, need a better way to set user resource, route
      ret.iconUrl = [(options.path ? options.path : ""), "api", "users", user._id, "icon"].join("/");
    }
  }
}

UserSchema.set("toJSON", {
  transform: transform
});

exports.transform = transform;

// Creates the Model for the User Schema
var User = mongoose.model('User', UserSchema);
exports.Model = User;

var encryptP***REMOVED***word = function(p***REMOVED***word, done) {
  if (!p***REMOVED***word) return done(null, null);

  hasher.encryptP***REMOVED***word(p***REMOVED***word, function(err, encryptedP***REMOVED***word) {
    if (err) return done(err);

    done(null, encryptedP***REMOVED***word);
  });
}

exports.getUserById = function(id, callback) {
  User.findById(id).populate('roleId').exec(function(err, user) {
    callback(err, user);
  });
}

exports.getUserByUsername = function(username, callback) {
  User.findOne({username: username.toLowerCase()}).populate('roleId').exec(function(err, user) {
    callback(err, user);
  });
}

exports.getUsers = function(callback) {
  var query = {};
  User.find(query, function (err, users) {
    if (err) {
      console.log("Error finding users: " + err);
    }

    callback(err, users);
  });
}

exports.createUser = function(user, callback) {
  var create = {
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    phones: user.phones,
    p***REMOVED***word: user.p***REMOVED***word,
    active: user.active,
    roleId: user.roleId,
    avatar: user.avatar,
    icon: user.icon
  }

  User.create(create, function(err, user) {
    if (err) return callback(err);

    callback(null, user);
  });
}

exports.updateUser = function(user, callback) {
  user.save(function(err) {
    if (err) {
      console.log('Could not update user ' + user.username + ' error ' + err);
    }

    callback(err, user)
  });
}

exports.deleteUser = function(user, callback) {
  user.remove(function(err, removedUser) {
    if (err) console.log("Error removing user: " + err);
    callback(err, removedUser);
  });
}

exports.setStatusForUser = function(user, status, callback) {
  var update = { status: status };
  User.findByIdAndUpdate(user._id, update, function(err, user) {
    if (err) {
      console.log('could not set status for user: ' + user.username);
    }

    callback(err, user);
  });
}

exports.setRoleForUser = function(user, role, callback) {
  var update = { role: role };
  User.findByIdAndUpdate(user._id, update, function (err, user) {
    if (err) {
      console.log('could not set role ' + role + ' for user: ' + user.username);
    }

    callback(err, user);
  });
}

exports.removeRolesForUser = function(user, callback) {
  var update = { roles: [] };
  User.findByIdAndUpdate(user._id, update, function (err, user) {
    if (err) {
      console.log('could not remove roles for user ' + user.username);
    }

    callback(err, user);
  });
}

exports.setTeamsForUser = function(user, teamIds, callback) {
  user.teams = teamIds;
  user.save(function (err, user) {
    if (err) {
      console.log('could not set teams ' + teams.toString() + ' for user: ' + user.username);
    }

    callback(err, user);
  });
}

exports.removeTeamsForUser = function(user, callback) {
  var update = { teams: [] };
  User.findByIdAndUpdate(user._id, update, function (err, user) {
    if (err) {
      console.log('could not remove teams for user ' + user.username);
    }

    callback(err, user);
  });
}

exports.removeRoleFromUsers = function(role, callback) {
  User.update({role: role._id}, {roles: undefined}, function(err, number, raw) {
    if (err) {
      console.log('Error pulling role: ' + role.name + ' from all users', err);
    }

    callback(err, number);
  });
}

exports.removeTeamFromUsers = function(team, callback) {
  User.update({}, {'$pull': {teams: team._id}}, function(err, number, raw) {
    if (err) {
      console.log('Error pulling team: ' + team.name + ' from all users', err);
    }

    callback(err, number);
  });
}

exports.addRecentEventForUser = function(user, event, callback) {
  var eventIds = user.recentEventIds.slice();

  // push new event on from of list
  eventIds.unshift(event._id);

  // remove dupes
  eventIds = eventIds.filter(function(eventId, index) {
    return eventIds.indexOf(eventId) == index;
  });

  // limit to 5
  if (eventIds.length > 5) {
    eventIds = user.recentEventIds.slice(0, 4);
  }
  console.log('event ids', eventIds);

  User.findByIdAndUpdate(user._id, {recentEventIds: eventIds}, function(err, user) {
    callback(err, user);
  });
}
