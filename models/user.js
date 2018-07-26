var mongoose = require('mongoose')
  , async = require("async")
  , hasher = require('../utilities/pbkdf2')()
  , Token = require('../models/token')
  , Login = require('../models/login')
  , Event = require('../models/event')
  , Team = require('../models/team')
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
    type: { type: String, enum: ['none', 'upload', 'create'], default: 'none' },
    text: { type: String },
    color: { type: String },
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
  versionKey: false,
  timestamps: {
    updatedAt: 'lastUpdated'
  }
});

UserSchema.method('validPassword', function(password, callback) {
  var user = this;
  if (user.authentication.type !== 'local') return callback(null, false);

  hasher.validPassword(password, user.authentication.password, callback);
});

// Lowercase the username we store, this will allow for case insensitive usernames
// Validate that username does not already exist
UserSchema.pre('save', function(next) {
  var user = this;
  user.username = user.username.toLowerCase();
  this.model('User').findOne({username: user.username}, function(err, possibleDuplicate) {
    if (err) return next(err);

    if (possibleDuplicate && !possibleDuplicate._id.equals(user._id)) {
      var error = new Error('username already exists');
      error.status = 400;
      return next(error);
    }

    next();
  });
});

// Encrypt password before save
UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (user.authentication.type !== 'local' || !user.isModified('authentication.password')) {
    return next();
  }

  var self = this;
  async.waterfall([
    function(done) {
      self.constructor.findById(user._id, done);
    },
    function(existingUser, done) {
      if (!existingUser) {
        // Creating new user, don't check previous password
        return done();
      }

      // Verify that the new password is different from the existing password
      hasher.validPassword(user.authentication.password, existingUser.authentication.password, function(err, isValid) {
        if (err) return done(err);

        if (isValid) {
          err = new Error('Password cannot be the same as previous password');
          err.status = 400;
        }

        done(err);
      });
    },
    function(done) {
      // Finally hash the password
      hasher.hashPassword(user.authentication.password, function(err, hashedPassword) {
        if (err) return next(err);

        user.authentication.password = hashedPassword;
        done();
      });
    }
  ], function(err) {
    return next(err);
  });
});

UserSchema.pre('save', function(next) {
  var user = this;
  if (user.active === false) {
    Token.removeTokensForUser(user, function(err) {
      next(err);
    });
  } else {
    next();
  }
});

UserSchema.post('save', function(err, user, next) {
  if (err.name === 'MongoError' && err.code === 11000) {
    err = new Error('username already exists');
    err.status = 400;
  }

  next(err);
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
      Location.removeLocationsForUser(user, done);
    },
    cappedlocation: function(done) {
      CappedLocation.removeLocationsForUser(user, done);
    },
    token: function(done) {
      Token.removeTokensForUser(user, done);
    },
    login: function(done) {
      Login.removeLoginsForUser(user, done);
    },
    observation: function(done) {
      Observation.removeUser(user, done);
    },
    eventAcl: function(done) {
      Event.removeUserFromAllAcls(user, function(err) {
        console.log('event acl remove', err);
        done(err);
      });
    },
    teamAcl: function(done) {
      Team.removeUserFromAllAcls(user, done);
    }
  },
  function(err) {
    console.log('remove all user stuff with err', err);
    next(err);
  });
});

var transform = function(user, ret, options) {
  if ('function' !== typeof user.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;

    if (ret.authentication) {
      delete ret.authentication.password;
    }

    delete ret.avatar;
    if (ret.icon) { // TODO remove if check, icon is always there
      delete ret.icon.relativePath;
    }

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
};

UserSchema.set("toJSON", {
  transform: transform
});

UserSchema.set("toObject", {
  transform: transform
});

exports.transform = transform;

// Creates the Model for the User Schema
var User = mongoose.model('User', UserSchema);
exports.Model = User;

exports.getUserById = function(id, callback) {
  User.findById(id).populate('roleId').exec(function(err, user) {
    callback(err, user);
  });
};

exports.getUserByUsername = function(username, callback) {
  User.findOne({username: username.toLowerCase()}).populate('roleId').exec(function(err, user) {
    callback(err, user);
  });
};

exports.getUserByAuthenticationId = function(authenticationType, id, callback) {
  User.findOne({'authentication.type': authenticationType, 'authentication.id': id}).populate('roleId').exec(function(err, user) {
    callback(err, user);
  });
};

exports.count = function(callback) {
  User.count({}, function(err, count) {
    callback(err, count);
  });
};

exports.getUsers = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};
  options = options || {};
  var filter = options.filter || {};

  if (filter.active === true) {
    conditions.active = true;
  }

  if (filter.active === false) {
    conditions.active = false;
  }

  var populate = [];
  if (options.populate && (options.populate.indexOf('roleId') !== -1)) {
    populate.push({path: 'roleId'});
  }

  var query = User.find(conditions);
  if (populate.length) {
    query = query.populate(populate);
  }

  query.exec(function(err, users) {
    callback(err, users);
  });
};

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
  };

  User.create(create, function(err, user) {
    if (err) return callback(err);

    user.populate('roleId', function(err, user) {
      callback(err, user);
    });
  });
};

exports.updateUser = function(user, callback) {
  user.save(function(err, user) {
    if (err) return callback(err);

    user.populate('roleId', function(err, user) {
      callback(err, user);
    });
  });
};

exports.deleteUser = function(user, callback) {
  console.log('delete user', user._id);
  user.remove(function(err, removedUser) {
    // console.log('deleted user', err);

    callback(err, removedUser);
  });
};

exports.setStatusForUser = function(user, status, callback) {
  var update = { status: status };
  User.findByIdAndUpdate(user._id, update, {new: true}, function(err, user) {
    callback(err, user);
  });
};

exports.setRoleForUser = function(user, role, callback) {
  var update = { role: role };
  User.findByIdAndUpdate(user._id, update, {new: true}, function (err, user) {
    callback(err, user);
  });
};

exports.removeRolesForUser = function(user, callback) {
  var update = { roles: [] };
  User.findByIdAndUpdate(user._id, update, {new: true}, function (err, user) {
    callback(err, user);
  });
};

exports.removeRoleFromUsers = function(role, callback) {
  User.update({role: role._id}, {roles: undefined}, function(err, number) {
    callback(err, number);
  });
};

exports.addRecentEventForUser = function(user, event, callback) {
  let eventIds = Array.from(user.recentEventIds);

  // push new event onto front of the list
  eventIds.unshift(event._id);

  // remove duplicates
  eventIds = eventIds.filter(function(eventId, index) {
    return eventIds.indexOf(eventId) === index;
  });

  // limit to 5
  if (eventIds.length > 5) {
    eventIds = eventIds.slice(0, 5);
  }

  User.findByIdAndUpdate(user._id, {recentEventIds: eventIds}, {new: true}, function(err, user) {
    callback(err, user);
  });
};

exports.removeRecentEventForUsers = function(event, callback) {
  var update = {
    $pull: { recentEventIds: event._id }
  };

  User.update({}, update, {multi: true}, function(err) {
    callback(err);
  });
};
