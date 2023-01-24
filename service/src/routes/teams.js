module.exports = function(app, security) {
  const Team = require('../models/team')
    , access = require('../access')
    , pageinfoTransformer = require('../transformers/pageinfo')
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
      users: req.param('users'),
      userIds: req.param('userIds')
    };

    next();
  }

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

  // get all teams
  app.get(
    '/api/teams',
    determineReadAccess,
    function (req, res, next) {
      const limit = req.query.limit || null;
      const start = req.query.start || null;
      const sort = req.query.sort || null;
      const omitEventTeams = /^true$/i.test(String(req.query.omit_event_teams));
      const searchTerm = req.query.term || null;
      const queryParamArray = queryParam => Array.isArray(queryParam) ? queryParam : (typeof queryParam === 'string' ? [ queryParam ] : null);
      const withMembers = queryParamArray(req.query.with_members);
      const withoutMembers = queryParamArray(req.query.without_members);

      Team.getTeams(
        { access: req.access, populate: req.query.populate, omitEventTeams, limit, start, sort, searchTerm, withMembers, withoutMembers },
        function (err, teams, page) {
          if (err)  {
            return next(err);
          }
          let data = null;
          if (page != null) {
            data = [ pageinfoTransformer.transform(page, req, start, limit) ];
          }
          else {
            data = teams.map(function(team) {
              return team.toObject({access: req.access, path: req.getRoot()});
            });
          }
          res.json(data);
        }
      );
    }
  );

  app.get(
    '/api/teams/count',
    determineReadAccess,
    function(req, res, next) {
      var filter = {};

      if(req.query) {
        for (let [key, value] of Object.entries(req.query)) {
          if(key == 'populate' || key == 'limit' || key == 'start' || key == 'sort'){
            continue;
          }
          filter[key] = value;
        }
      }

      Team.count({access: req.access, filter: filter }, function(err, count) {
        if (err) return next(err);

        res.json({count: count});
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

  // Update a team
  // TODO: ignoring acl here
  app.put(
    '/api/teams/:teamId',
    authorizeAccess('UPDATE_TEAM', 'update'),
    validateTeamParams,
    function(req, res, next) {
      const update = {};
      if (req.teamParam.name) update.name = req.teamParam.name;
      if (req.teamParam.description) update.description = req.teamParam.description;
      if (req.teamParam.users) update.users = req.teamParam.users;
      if (req.teamParam.userIds) update.userIds = req.teamParam.userIds;

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

  app.get(
    '/api/teams/:id/members',
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Team.getMembers(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Team not found');

        res.json(page);
      }).catch(err => next(err));
    }
  );

  app.get(
    '/api/teams/:id/nonMembers',
    determineReadAccess,
    async function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Team.getNonMembers(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Team not found');

        res.json(page);
      }).catch(err => next(err))
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

  app.get(
    '/api/teams/:id/members',
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Team.getMembers(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Team not found');

        res.json(page);
      }).catch(err => next(err));
    }
  );

  app.get(
    '/api/teams/:id/nonMembers',
    determineReadAccess,
    async function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Team.getNonMembers(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Team not found');

        res.json(page);
      }).catch(err => next(err))
    }
  );

};
