var mongoose = require('mongoose')
  , hasher = require('../utilities/pbkdf2')();

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema; 

var PhoneSchema = new Schema({
  type: { type: String, required: true },
  number: { type: String, required: true }
});

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
  },{ 
    versionKey: false
  }
);

UserSchema.method('validP***REMOVED***word', function(p***REMOVED***word, callback) {
  var user = this;
  hasher.validP***REMOVED***word(p***REMOVED***word, user.p***REMOVED***word, callback);
});

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

UserSchema.set("toObject", {
  transform: function(user, ret, options) {
    delete ret.p***REMOVED***word;
  }
});

UserSchema.set("toJSON", {
  transform: function(user, ret, options) {
    delete ret.p***REMOVED***word;
  }
});

// Creates the Model for the User Schema
var User = mongoose.model('User', UserSchema);

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
  User.findOne(query, callback);
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
    p***REMOVED***word: user.p***REMOVED***word
  }

  User.create(create, function(err, user) {
    if (err) {
      console.log('Could not create user: ' + JSON.stringify(create));
    }

    callback(err, user);
  });
}

exports.updateUser = function(id, update, callback) {
  console.log('in model trying to update user: ' + JSON.stringify(update));

  User.findByIdAndUpdate(id, update, function(err, user) {
    if (err) {
      console.log('Could not update user ' + id + '. error: ' + err);
    }

    callback(err, user);
  });
}

exports.deleteUser = function(user, callback) {
  var conditions = { _id: user._id };
  User.remove(conditions, callback);
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