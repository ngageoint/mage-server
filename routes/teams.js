module.exports = function(app, security) {
  var Team = require('../models/team')
    , access = require('../access')
    , passport = security.authentication.passport;

  app.all('/api/teams*', passport.authenticate('bearer'));

  function validateTeamParams(req, res, next) {
    var name = req.param('name');
    if (!name) {
      return res.status(400).send("cannot create team 'name' param not specified");
    }

    req.teamParam = {
      name: name,
      description: req.param('description'),
      users: req.param('users')
    };

    next();
  }

  app.get(
    '/api/teams/count',
    access.authorize('READ_TEAM'),
    function(req, res, next) {
      Team.count(function(err, count) {
        if (err) return next(err);

        res.json({count: count});
      });
    }
  );

  // get all teams
  app.get(
    '/api/teams',
    access.authorize('READ_TEAM'),
      function (req, res, next) {
      Team.getTeams(function (err, teams) {
        if (err) return next(err);

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
    function(req, res, next) {
      Team.createTeam(req.teamParam, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  // Update a team
  app.put(
    '/api/teams/:teamId',
    access.authorize('UPDATE_TEAM'),
    validateTeamParams,
    function(req, res, next) {
      var update = {};
      if (req.teamParam.name) update.name = req.teamParam.name;
      if (req.teamParam.description !== null) update.description = req.teamParam.description;
      if (req.teamParam.users) update.users = req.teamParam.users;

      Team.updateTeam(req.team._id, update, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  // Delete a team
  app.delete(
    '/api/teams/:teamId',
    access.authorize('DELETE_TEAM'),
    function(req, res, next) {
      Team.deleteTeam(req.team, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  app.post(
    '/api/teams/:teamId/users',
    access.authorize('UPDATE_TEAM'),
    function(req, res, next) {
      Team.addUser(req.team, req.body, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  app.delete(
    '/api/teams/:teamId/users/:id',
    access.authorize('UPDATE_TEAM'),
    function(req, res, next) {
      Team.removeUser(req.team, {id: req.params.id}, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );
};
