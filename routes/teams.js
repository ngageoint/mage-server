module.exports = function(app, auth) {
  var Team = require('../models/team');

  var p***REMOVED***port = auth.p***REMOVED***port;

  var validateTeamParams = function(req, res, next) {
    var name = req.param('name');
    if (!name) {
      return res.send(400, "cannot create team 'name' param not specified");
    }

    var description = req.param('description');

    req.team = {name: name, description: description};
    next();
  }

  // get all teams
  app.get(
    '/api/teams', 
    p***REMOVED***port.authenticate('bearer'), 
      function (req, res) {
      Team.getTeams(function (err, teams) {
        res.json(teams);
      });
  });

  // get team
  app.get(
    '/api/teams/:teamId', 
    p***REMOVED***port.authenticate('bearer'), 
    function (req, res) {
      res.json(req.team);
    }
  );

  // Create a new team
  app.post(
    '/api/teams',
    validateTeamParams,
    p***REMOVED***port.authenticate('bearer'),
    function(req, res) {
      Team.createTeam(req.team, function(err, team) {
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
    p***REMOVED***port.authenticate('bearer'),
    validateTeamParams, 
    function(req, res) {
      Team.updateTeam(req.params.teamId, req.team, function(err, team) {
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
    p***REMOVED***port.authenticate('bearer'),
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