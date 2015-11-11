var mongoose = require('mongoose')
  , async = require("async")
  , hasher = require('../utilities/pbkdf2')()
  , Token = require('../models/token')
  , Login = require('../models/login')
  , Observation = require('../models/observation')
  , Location = require('../models/location')
  , CappedLocation = require('../models/cappedLocation');

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
  displayName: { type: String, required: true },
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
  authentication: {
    type: { type: String, required: false },
    id: { type: String, required: false },
    password: { type: String, required: false }
  }
},{
  versionKey: false
});

UserSchema.method('validPassword', function(password, callback) {
  var user = this;
  if (user.authentication.type !== 'local') return callback(null, true);

  hasher.validPassword(password, user.authentication.password, callback);
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

// Encrypt password before save
UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (user.authentication.type === 'local' && user.isModified('authentication.password')) {
    hasher.encryptPassword(user.authentication.password, function(err, encryptedPassword) {
      if (err) return next(err);

      user.authentication.password = encryptedPassword;
      next();
    });
  } else {
    next();
  }
});

// Remove Token if password changed
UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
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
    location: function(done) {
      Location.removeLocationsForUser(user, function(err) {
        done(err);
      });
    },
    cappedlocation: function(done) {
      CappedLocation.removeLocationsForUser(user, function(err) {
        done(err);
      });
    },
    token: function(done) {
      Token.removeTokensForUser(user, function(err) {
        done(err);
      });
    },
    login: function(done) {
      Login.removeLoginsForUser(user, function(err) {
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

    if (ret.authentication) {
      delete ret.authentication.password;
    }

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

var encryptPassword = function(password, done) {
  if (!password) return done(null, null);

  hasher.encryptPassword(password, function(err, encryptedPassword) {
    if (err) return done(err);

    done(null, encryptedPassword);
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

exports.getUserByAuthenticationId = function(authenticationType, id, callback) {
  User.findOne({'authentication.type': authenticationType, 'authentication.id': id}).populate('roleId').exec(function(err, user) {
    callback(err, user);
  });
}

exports.count = function(callback) {
  User.count({}, function(err, count) {
    callback(err, count);
  });
}

exports.getUsers = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};
  var options = options || {};
  var filter = options.filter || {};

  if (filter.active === true) {
    conditions.active = true;
  }

  if (filter.active === false) {
    conditions.active = false;
  }

  var populate = [];
  if (options.populate) {
    if (options.populate.indexOf('roleId') != -1) {
      populate.push({path: 'roleId'});
    }
  }

  var query = User.find(conditions);
  if (populate.length) {
    query = query.populate(populate);
  }

  query.exec(function(err, users) {
    callback(err, users);
  });
}

exports.createUser = function(user, callback) {
  var create = {
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    phones: user.phones,
    active: user.active,
    roleId: user.roleId,
    avatar: user.avatar,
    icon: user.icon,
    authentication: user.authentication
  }

  User.create(create, function(err, user) {
    if (err) return callback(err);

    user.populate('roleId', function(err, user) {
      callback(err, user);
    });
  });
}

exports.updateUser = function(user, callback) {
  user.save(function(err, user) {
    if (err) return callback(err);

    user.populate('roleId', function(err, user) {
      callback(err, user);
    });
  });
}

exports.deleteUser = function(user, callback) {
  user.remove(function(err, removedUser) {
    callback(err, removedUser);
  });
}

exports.setStatusForUser = function(user, status, callback) {
  var update = { status: status };
  User.findByIdAndUpdate(user._id, update, {new: true}, function(err, user) {
    callback(err, user);
  });
}

exports.setRoleForUser = function(user, role, callback) {
  var update = { role: role };
  User.findByIdAndUpdate(user._id, update, {new: true}, function (err, user) {
    callback(err, user);
  });
}

exports.removeRolesForUser = function(user, callback) {
  var update = { roles: [] };
  User.findByIdAndUpdate(user._id, update, {new: true}, function (err, user) {
    callback(err, user);
  });
}

exports.setTeamsForUser = function(user, teamIds, callback) {
  user.teams = teamIds;
  user.save(function (err, user) {
    callback(err, user);
  });
}

exports.removeTeamsForUser = function(user, callback) {
  var update = { teams: [] };
  User.findByIdAndUpdate(user._id, update, {new: true}, function (err, user) {
    callback(err, user);
  });
}

exports.removeRoleFromUsers = function(role, callback) {
  User.update({role: role._id}, {roles: undefined}, function(err, number, raw) {
    callback(err, number);
  });
}

exports.removeTeamFromUsers = function(team, callback) {
  User.update({}, {'$pull': {teams: team._id}}, function(err, number, raw) {
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

  User.findByIdAndUpdate(user._id, {recentEventIds: eventIds}, {new: true}, function(err, user) {
    callback(err, user);
  });
}

exports.removerRecentEventForUsers = function(event, callback) {
  var update = {
    $pull: { recentEventIds: event._id }
  };

  User.update({}, update, {multi: true}, function(err) {
    callback(err);
  });
}
