"use strict";

const mongoose = require('mongoose')
  , async = require("async")
  , moment = require('moment')
  , Setting = require('./setting')
  , Token = require('./token')
  , Login = require('./login')
  , Event = require('./event')
  , Team = require('./team')
  , Observation = require('./observation')
  , Location = require('./location')
  , CappedLocation = require('./cappedLocation')
  , Authentication = require('./authentication')
  , Paging = require('../utilities/paging')
  , FilterParser = require('../utilities/filterParser');


// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const PhoneSchema = new Schema({
  type: { type: String, required: true },
  number: { type: String, required: true }
}, {
  versionKey: false,
  _id: false
});

// Collection to hold users
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: { type: String, required: false },
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
  enabled: { type: Boolean, default: true, required: true },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  status: { type: String, required: false, index: 'sparse' },
  recentEventIds: [{ type: Number, ref: 'Event' }],
  authenticationId: { type: Schema.Types.ObjectId, ref: 'Authentication', required: true }
}, {
  versionKey: false,
  timestamps: {
    updatedAt: 'lastUpdated'
  }
});

UserSchema.method('validPassword', function (password, callback) {
  const user = this;
  Authentication.validPassword(user.authenticationId, password, callback);
});

// Lowercase the username we store, this will allow for case insensitive usernames
// Validate that username does not already exist
UserSchema.pre('save', function (next) {
  const user = this;
  user.username = user.username.toLowerCase();
  this.model('User').findOne({ username: user.username }, function (err, possibleDuplicate) {
    if (err) return next(err);

    if (possibleDuplicate && !possibleDuplicate._id.equals(user._id)) {
      var error = new Error('username already exists');
      error.status = 400;
      return next(error);
    }

    next();
  });
});

UserSchema.pre('save', function (next) {
  const user = this;
  if (user.active === false || user.enabled === false) {
    Token.removeTokensForUser(user, function (err) {
      next(err);
    });
  } else {
    next();
  }
});

UserSchema.post('save', function (user) {
  manageAuthProperty(user);
});

UserSchema.pre('remove', function (next) {
  const user = this;

  async.parallel({
    location: function (done) {
      Location.removeLocationsForUser(user, done);
    },
    cappedlocation: function (done) {
      CappedLocation.removeLocationsForUser(user, done);
    },
    token: function (done) {
      Token.removeTokensForUser(user, done);
    },
    login: function (done) {
      Login.removeLoginsForUser(user, done);
    },
    observation: function (done) {
      Observation.removeUser(user, done);
    },
    eventAcl: function (done) {
      Event.removeUserFromAllAcls(user, function (err) {
        done(err);
      });
    },
    teamAcl: function (done) {
      Team.removeUserFromAllAcls(user, done);
    },
    authentication: function (done) {
      Authentication.removeAuthenticationById(user.authenticationId, done);
    }
  },
    function (err) {
      next(err);
    });
});

UserSchema.post('findOne', function (user) {
  manageAuthProperty(user);
});

UserSchema.post('findById', function (user) {
  manageAuthProperty(user);
});

UserSchema.post('find', function (users) {
  for (const user of users) {
    manageAuthProperty(user);
  }
});

function manageAuthProperty(user) {
  if (user && user.populated('authenticationId')) {
    user.authentication = user.authenticationId;
  }
};

// eslint-disable-next-line complexity
const transform = function (user, ret, options) {
  if ('function' !== typeof user.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;

    delete ret.avatar;
    if (ret.icon) { // TODO remove if check, icon is always there
      delete ret.icon.relativePath;
    }

    if (user.populated('roleId')) {
      ret.role = ret.roleId;
      delete ret.roleId;
    }

    if (user.populated('authenticationId')) {
      ret.authentication = ret.authenticationId;
      delete ret.authentication.password;
      delete ret.authenticationId;
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
  transform: transform,
  virtuals: true
});

UserSchema.set("toObject", {
  transform: transform,
  virtuals: true
});

exports.transform = transform;

// Creates the Model for the User Schema
const User = mongoose.model('User', UserSchema);
exports.Model = User;

exports.getUserById = function (id, callback) {
  let result = User.findById(id).populate('roleId').populate('authenticationId');
  if (typeof callback === 'function') {
    result = result.then(
      user => {
        callback(null, user);
      },
      err => {
        callback(err);
      });
  }
  return result;
};

exports.getUserByUsername = function (username, callback) {
  User.findOne({ username: username.toLowerCase() }).populate('roleId').populate('authenticationId').exec(function (err, user) {
    callback(err, user);
  });
};

exports.getUserByAuthenticationId = function (authenticationType, id, callback) {
  Authentication.getAuthenticationByAuthIdAndType(id, authenticationType).then(auth => {
    return getUserById(auth.userId, callback);
  }).catch(err => {
    callback(err);
  });
};

exports.count = function (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  const filter = options.filter || {};

  const conditions = createQueryConditions(filter);

  User.count(conditions, function (err, count) {
    callback(err, count);
  });
};

exports.getUsers = function (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  const filter = options.filter || {};

  const conditions = createQueryConditions(filter);

  let query = User.find(conditions).populate('authenticationId');

  if (options.populate && (options.populate.indexOf('roleId') !== -1)) {
    query = query.populate('roleId');
  }

  const isPaging = options.limit != null && options.limit > 0;
  if (isPaging) {
    const countQuery = User.find(conditions);
    Paging.pageUsers(countQuery, query, options, callback);
  } else {
    query.exec(function (err, users) {
      callback(err, users, null);
    });
  }
};

function createQueryConditions(filter) {
  const conditions = FilterParser.parse(filter);

  if (filter.active) {
    conditions.active = filter.active == 'true';
  }
  if (filter.enabled) {
    conditions.enabled = filter.enabled == 'true';
  }

  return conditions;
};

exports.createUser = function (user, callback) {
  const update = {
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    phones: user.phones,
    active: user.active,
    roleId: user.roleId,
    avatar: user.avatar,
    icon: user.icon
  };

  Authentication.createAuthentication(user.authentication).then(auth => {
    update.authenticationId = auth._id;
    User.create(update, function (err, user) {
      if (err) return callback(err);
      user.populate('roleId', function (err, user) {
        callback(err, user);
      });
    });
  }).catch(err => {
    callback(err);
  });
};

exports.updateUser = function (user, callback) {
  if (user.hasOwnProperty('authentication')) {
    user.authentication._id = user.authenticationId;
    Authentication.updateAuthentication(user.authentication).then(() => {
      user.authenticationId = user.authenticationId._id;
      delete user.authentication;
      user.save(function (err, user) {
        if (err) return callback(err);

        user.populate('roleId', function (err, user) {
          callback(err, user);
        });
      });
    }).catch(err => {
      callback(err);
    });
  } else {
    user.save(function (err, user) {
      if (err) return callback(err);

      user.populate('roleId', function (err, user) {
        callback(err, user);
      });
    });
  }
};

exports.deleteUser = function (user, callback) {
  user.remove(function (err, removedUser) {
    callback(err, removedUser);
  });
};

exports.invalidLogin = function (user) {
  return Setting.getSetting('security')
    .then((securitySettings = { settings: { accountLock: {} } }) => {
      let { enabled, max, interval, threshold } = securitySettings.settings.accountLock;
      if (!enabled) return Promise.resolve(user);

      let security = user.authentication.security;
      const invalidLoginAttempts = security.invalidLoginAttempts + 1;
      if (invalidLoginAttempts >= threshold) {
        const numberOfTimesLocked = security.numberOfTimesLocked + 1;
        if (numberOfTimesLocked >= max) {
          user.enabled = false;
          user.authentication.security = {};
        } else {
          user.authentication.security = {
            locked: true,
            numberOfTimesLocked: numberOfTimesLocked,
            lockedUntil: moment().add(interval, 'seconds').toDate()
          };
        }
      } else {
        security.invalidLoginAttempts = invalidLoginAttempts;
        security.locked = undefined;
        security.lockedUntil = undefined;
      }

      return user.save();
    }).catch(err => {
      return Promise.reject(err);
    });
};

exports.validLogin = function (user) {
  user.authentication.security = {};
  return user.save();
};

exports.setStatusForUser = function (user, status, callback) {
  const update = { status: status };
  User.findByIdAndUpdate(user._id, update, { new: true }, function (err, user) {
    callback(err, user);
  });
};

exports.setRoleForUser = function (user, role, callback) {
  const update = { role: role };
  User.findByIdAndUpdate(user._id, update, { new: true }, function (err, user) {
    callback(err, user);
  });
};

exports.removeRolesForUser = function (user, callback) {
  const update = { roles: [] };
  User.findByIdAndUpdate(user._id, update, { new: true }, function (err, user) {
    callback(err, user);
  });
};

exports.removeRoleFromUsers = function (role, callback) {
  User.update({ role: role._id }, { roles: undefined }, function (err, number) {
    callback(err, number);
  });
};

exports.addRecentEventForUser = function (user, event, callback) {
  let eventIds = Array.from(user.recentEventIds);

  // push new event onto front of the list
  eventIds.unshift(event._id);

  // remove duplicates
  eventIds = eventIds.filter(function (eventId, index) {
    return eventIds.indexOf(eventId) === index;
  });

  // limit to 5
  if (eventIds.length > 5) {
    eventIds = eventIds.slice(0, 5);
  }

  User.findByIdAndUpdate(user._id, { recentEventIds: eventIds }, { new: true }, function (err, user) {
    callback(err, user);
  });
};

exports.removeRecentEventForUsers = function (event, callback) {
  const update = {
    $pull: { recentEventIds: event._id }
  };

  User.update({}, update, { multi: true }, function (err) {
    callback(err);
  });
};

exports.getUserByAuthenticationId = function (authenticationId) {
  return User.findOne({ authenticationId: authenticationId }).populate('authenticationId').exec();
}
