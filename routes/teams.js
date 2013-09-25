module.exports = function(app, security) {
  var Team = require('../models/team')
    , access = require('../access')
    , p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/teams*', p***REMOVED***port.authenticate(authenticationStrategy));

  var validateTeamParams = function(req, res, next) {
    var name = req.param('name');
    if (!name) {
      return res.send(400, "cannot create team 'name' param not specified");
    }

    var description = req.param('description');

    req.teamParam = {name: name, description: description};
    next();
  }

  // get all teams
  app.get(
    '/api/teams', 
    access.authorize('READ_TEAM'),
      function (req, res) {
      Team.getTeams(function (err, teams) {
        res.json(teams);
      });
  });

  // get team
  app.get(
    '/api/teams/:teamId', 
    access.authorize('READ_TEAM'), 
    function (req, res) {
      res.json(req.team);
    }
  );

  // Create a new team
  app.post(
    '/api/teams',
    access.authorize('CREATE_TEAM'),
    validateTeamParams,
    function(req, res) {
      Team.createTeam(req.teamParam, function(err, team) {
        if (err) {
          return res.send(400, err);
        }

        res.json(team);
      });
    }
  );

  // Update a team
  app.put(
    '/api/teams/:teamId',
    access.authorize('UPDATE_TEAM'), 
    function(req, res) {
      var update = {};
      if (req.teamParam.name) update.name = req.teamParam.name;
      if (req.teamParam.description) update.description = req.teamParam.description;

      Team.updateTeam(req.team._id, update, function(err, team) {
        if (err) {
          return res.send(400, err);
        }

        res.json(team);
      });
    }
  );

  // Delete a team
  app.delete(
    '/api/teams/:teamId', 
    access.authorize('DELETE_TEAM'),
    function(req, res) {
      Team.deleteTeam(req.team, function(err, team) {
        if (err) {
          return res.send(400, err);
        }

        res.json(team);
      });
    }
  );
}