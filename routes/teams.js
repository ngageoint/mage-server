module.exports = function(app, security) {
  var Team = require('../models/team')
    , access = require('../access')
    , passport = security.authentication.passport;

  app.all('/api/teams*', passport.authenticate('bearer'));

  function determineReadAccess(req, res, next) {
    if (!access.userHasPermission(req.user, 'READ_TEAM')) {
      req.access = { user: req.user, permission: 'read' };
    }

    next();
  }

  function authorizeAccess(collectionPermission, aclPermission) {
    return function(req, res, next) {
      if (access.userHasPermission(req.user, collectionPermission)) {
        next();
      } else {
        var hasPermission = Team.userHasAclPermission(req.team, req.user._id, aclPermission);
        hasPermission ? next() : res.sendStatus(403);
      }
    };
  }

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
    determineReadAccess,
    function(req, res, next) {
      Team.count({access: req.access}, function(err, count) {
        if (err) return next(err);

        res.json({count: count});
      });
    }
  );

  // get all teams
  app.get(
    '/api/teams',
    determineReadAccess,
    function (req, res, next) {
      Team.getTeams({access: req.access}, function (err, teams) {
        if (err) return next(err);

        res.json(teams.map(function(team) {
          return team.toObject({access: req.access, path: req.getRoot()});
        }));
      });
    }
  );

  // get team
  app.get(
    '/api/teams/:teamId',
    authorizeAccess('READ_TEAM', 'read'),
    function (req, res) {
      res.json(req.team.toObject({access: req.access, path: req.getRoot()}));
    }
  );

  // Create a new team
  app.post(
    '/api/teams',
    access.authorize('CREATE_TEAM'),
    validateTeamParams,
    function(req, res, next) {
      Team.createTeam(req.teamParam, req.user, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  // Update a team
  app.put(
    '/api/teams/:teamId',
    authorizeAccess('UPDATE_TEAM', 'update'),
    validateTeamParams,
    function(req, res, next) {
      var update = {};
      if (req.teamParam.name) update.name = req.teamParam.name;
      if (req.teamParam.description) update.description = req.teamParam.description;
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
    authorizeAccess('DELETE_TEAM', 'delete'),
    function(req, res, next) {
      Team.deleteTeam(req.team, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  app.put(
    '/api/teams/:teamId/acl/:id',
    authorizeAccess('UPDATE_TEAM', 'update'),
    function(req, res, next) {
      Team.updateUserInAcl(req.team._id, req.params.id, req.body.role, function(err, event) {
        if (err) return next(err);
        res.json(event);
      });
    }
  );

  app.delete(
    '/api/teams/:teamId/acl/:id',
    authorizeAccess('UPDATE_TEAM', 'update'),
    function(req, res, next) {
      Team.removeUserFromAcl(req.team._id, req.params.id, function(err, event) {
        if (err) return next(err);
        res.json(event);
      });
    }
  );

  app.post(
    '/api/teams/:teamId/users',
    authorizeAccess('UPDATE_TEAM', 'update'),
    function(req, res, next) {
      Team.addUser(req.team, req.body, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );

  app.delete(
    '/api/teams/:teamId/users/:id',
    authorizeAccess('UPDATE_TEAM', 'update'),
    function(req, res, next) {
      Team.removeUser(req.team, {id: req.params.id}, function(err, team) {
        if (err) return next(err);

        res.json(team);
      });
    }
  );
};
