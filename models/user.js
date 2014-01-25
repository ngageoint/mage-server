var mongoose = require('mongoose')
  , async = require("async")
  , hasher = require('../utilities/pbkdf2')()
  , config = require('../config')
  , Token = require('../models/token')
  , Location = require('../models/location');

var locationLimit = config.server.locationServices.userCollectionLocationLimit;

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema; 

var PhoneSchema = new Schema({
  type: { type: String, required: true },
  number: { type: String, required: true }
},{
  versionKey: false,
  _id: false
});

// Creates the Schema for FFT Locations
var LocationSchema = new Schema({
  type: { type: String, required: true },
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true}
  },
  properties: Schema.Types.Mixed
},{
    versionKey: false
});

LocationSchema.index({geometry: "2dsphere"});
LocationSchema.index({'properties.timestamp': 1});

// Collection to hold users
var UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    p***REMOVED***word: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: {type: String, required: true },
    email: {type: String, required: false },
    phones: [PhoneSchema],
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    teams: [Schema.Types.ObjectId],
    status: { type: String, required: false, index: 'sparse' },
    locations: [LocationSchema]
  },{ 
    versionKey: false
  }
);

UserSchema.method('validP***REMOVED***word', function(p***REMOVED***word, callback) {
  var user = this;
  hasher.validP***REMOVED***word(p***REMOVED***word, user.p***REMOVED***word, callback);
});

// Validate that username does not already exist
UserSchema.pre('save', function(next) {
  var user = this;

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

  Token.removeTokenForUser(user, function(err) {
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
    token: function(done) {
      Token.removeTokenForUser(user, function(err) {
        done(err);
        next(err);
      })
    }
  });
});

var transformUser = function(user, ret, options) {
  if ('function' != typeof user.ownerDocument) {
    delete ret.p***REMOVED***word;
    delete ret.locations;
  }
}

UserSchema.set("toObject", {
  transform: transformUser
});

UserSchema.set("toJSON", {
  transform: transformUser
});

// Creates the Model for the User Schema
var User = mongoose.model('User', UserSchema);
exports.User = User;

var encryptP***REMOVED***word = function(p***REMOVED***word, done) {
  if (!p***REMOVED***word) return done(null, null);

  hasher.encryptP***REMOVED***word(p***REMOVED***word, function(err, encryptedP***REMOVED***word) {
    if (err) return done(err);

    done(null, encryptedP***REMOVED***word);
  });
}

exports.getUserById = function(id, callback) {
  User.findById(id).populate('role').exec(function(err, user) {
    if (err) {
      console.log("Error finding user: " + id + ', error: ' + err);
    }

    callback(err, user);
  });
}

exports.getUserByUsername = function(username, callback) {
  var query = {username: username};
  User.findOne(query).populate('role').exec(callback);
}

exports.getUsers = function(callback) {
  var query = {};
  User.find(query, function (err, users) {
    if (err) {
      console.log("Error finding users: " + err);
    }

    callback(users);
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
    role: user.role
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

exports.deleteUser = function(id, callback) {
  User.findById(id, function(err, user) {
    if (!user) {
      var msg = "User with id '" + id + "' not found and could not be deleted.";
      console.log(msg + " Error: " + err);
      return callback(new Error(msg));
    }

    user.remove(function(err, removedUser) {
      if (err) {
        console.log("Error removing user: " + err);
      }

      callback(err, removedUser);
    });
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

exports.getLocations = function(options, callback) {
  var limit = options.limit;
  limit = limit <= locationLimit ? limit : locationLimit;
  User.find({}, {_id: 1, locations: {$slice: -1 * limit}}, {lean: true}, function(err, users) {
    if (err) {
      console.log('Error getting locations.', err);
    }
    users = users.map(function(user) {
      user.user = user._id;
      delete user._id;
      user.locations = user.locations.reverse();

      return user;
    });

    callback(err, users);
  });
}

exports.addLocationsForUser = function(user, locations, callback) {
  var update = {$push: {locations: {$each: locations, $sort: {"properties.timestamp": 1}, $slice: -1 * locationLimit}}};
  User.findByIdAndUpdate(user._id, update, function(err, user) {
    if (err) {
      console.log('Error add location for user.', err);
    }

    callback(err, user);
  });
}