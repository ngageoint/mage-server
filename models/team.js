var mongoose = require('mongoose');

var User = require('./user');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;  

// Collection to hold users
var TeamSchema = new Schema({
    name: { type: String, required: true, unique: true},
    description: { type: String },
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

// Creates the Model for the User Schema
var Team = mongoose.model('Team', TeamSchema);

exports.getTeamById = function(id, callback) {
  Team.findById(id, callback);
}

exports.getTeams = function(callback) {
  var query = {};
  Team.find(query, function (err, teams) {
    if (err) {
      console.log("Error finding teams in mongo: " + err);
    }

    callback(err, teams);
  });
}

exports.createTeam = function(team, callback) {
  var create = {
    name: team.name,
    description: team.description
  }

  Team.create(create, function(err, team) {
    if (err) {
      console.log('error creating new team: ' + err);
    }

    callback(err, team);
  });
}

exports.updateTeam = function(id, update, callback) {
  Team.findByIdAndUpdate(id, update, function(err, team) {
    if (err) {
      console.log('error updating team: ' + id + 'err: ' + err);
    }

    callback(err, team);
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