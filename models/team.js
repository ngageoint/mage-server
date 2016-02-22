var mongoose = require('mongoose')
  , async = require('async')
  , Event = require('./event');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold users
var TeamSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  teamEventId: { type: Number, ref: 'Event' },
  userIds: [{type: Schema.Types.ObjectId, ref: 'User'}]
},{
  versionKey: false
});

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

function transform(team, ret) {
  ret.id = ret._id;
  delete ret._id;

  if (team.populated('userIds')) {
    ret.users = ret.userIds;
    delete ret.userIds;
  }
}

TeamSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the User Schema
var Team = mongoose.model('Team', TeamSchema);
exports.TeamModel = Team;

exports.getTeamById = function(id, callback) {
  Team.findById(id).populate('userIds').exec(callback);
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

exports.count = function(callback) {
  Team.count({}, function(err, count) {
    callback(err, count);
  });
};

exports.getTeams = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var query = {};
  if (options.teamIds) {
    query._id = {
      $in: options.teamIds
    };
  }

  Team.find(query).populate('userIds').exec(function (err, teams) {
    callback(err, teams);
  });
};

exports.createTeam = function(team, callback) {
  var create = {
    name: team.name,
    description: team.description
  };

  if (team.users) {
    create.userIds = team.users.map(function(user) { return mongoose.Types.ObjectId(user.id); });
  }

  Team.create(create, function(err, team) {
    if (err) return callback(err);

    Team.populate(team, {path: 'userIds'}, callback);
  });
};

exports.createTeamForEvent = function(event, callback) {
  async.waterfall([
    function(done) {
      var team = {
        name: event.name,
        description: "This team belongs specifically to event '" + event.name + "' and cannot be deleted.",
        teamEventId: event._id
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
