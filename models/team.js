var mongoose = require('mongoose');

var User = require('./user');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold users
var TeamSchema = new Schema({
    name: { type: String, required: true, unique: true},
    description: { type: String },
    memberIds: [{type: Schema.Types.ObjectId, ref: 'User'}],
  },{
    versionKey: false
  }
);

TeamSchema.pre('remove', function(next) {
  var team = this;

  User.removeTeamFromUsers(team, function(err, number) {
    next();
  });
});

var transform = function(team, ret, options) {
  ret.id = ret._id;
  delete ret._id;

  ret.members = ret.memberIds;
  delete ret.memberIds;
}

TeamSchema.set("toObject", {
  transform: transform
});

TeamSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the User Schema
var Team = mongoose.model('Team', TeamSchema);

exports.getTeamById = function(id, callback) {
  Team.findById(id).populate('memberIds').exec(callback);
}

exports.getTeams = function(callback) {
  var query = {};
  Team.find(query).populate('memberIds').exec(function (err, teams) {
    if (err) {
      console.log("Error finding teams in mongo: " + err);
    }

    callback(err, teams);
  });
}

exports.createTeam = function(team, callback) {
  var create = {
    name: team.name,
    description: team.description,
  }

  if (team.members) {
    create.memberIds = team.members.map(function(member) { return mongoose.Types.ObjectId(member.id); });
  }

  Team.create(create, function(err, team) {
    if (err) {
      console.log('error creating new team: ' + err);
    }

    Team.populate(team, {path: 'memberIds'}, callback);
  });
}

exports.updateTeam = function(id, update, callback) {
  if (update.members) {
    update.memberIds = update.members.map(function(member) { return mongoose.Types.ObjectId(member.id); });
  }

  Team.findByIdAndUpdate(id, update, function(err, team) {
    if (err) {
      console.log('error updating team: ' + id + 'err: ' + err);
    }

    Team.populate(team, {path: 'memberIds'}, callback);
  });
}

exports.deleteTeam = function(team, callback) {
  team.remove(function(err) {
    if (err) {
      console.log('could not delete team: ' + team.name);
    }

    callback(err, team);
  });
}
