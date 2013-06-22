module.exports = function() {
  var mongoose = require('mongoose');

  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;  

  // Collection to hold users
  var TeamSchema = new Schema({
      name: { type: String, required: true, unique: true},
      description: { type: String, required: true },
    },{ 
      versionKey: false 
    }
  );

  // Creates the Model for the User Schema
  var Team = mongoose.model('Team', TeamSchema);

  var getTeamById = function(id, callback) {
    Team.findById(id, callback);
  }

  var getTeams = function(callback) {
    var query = {};
    Team.find(query, function (err, teams) {
      if (err) {
        console.log("Error finding users in mongo: " + err);
      }

      callback(teams);
    });
  }

  var createTeam = function(team, callback) {
    //TODO need to ensure not a dup team name

    var create = {
      name: team.name,
      description: team.description
    }

    Team.create(create, callback);
  }

  var updateTeam = function(team, callback) {
    // TODO need to ensure not a dup team name

    var update = {
      name: team.username,
      description: team.firstname
    }

    Team.findByIdAndUpdate(team._id, update, callback);
  }

  var deleteTeam = function(team, callback) {
    var conditions = { _id: team._id };
    Team.remove(conditions, callback);
  }

  return {
    getTeamById: getTeamById,
    getTeams: getTeams,
    createTeam: createTeam,
    updateTeam: updateTeam,
    deleteTeam: deleteTeam
  }
}()