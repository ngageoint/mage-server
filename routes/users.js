module.exports = function(app, auth) {
  var User = require('../models/user')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access');

  var p***REMOVED***port = auth.p***REMOVED***port;
  var strategy = auth.strategy;

  var validateRoleParams = function(req, res, next) {
    var roleId = req.param('roleId');
    if (!roleId) {
      return res.send(400, "Cannot set role, 'roleId' param not specified");
    }

    Role.getRoleById(roleId, function(err, role) {
      if (err) return next(err);

      if (!role) return next(new Error('Role ***REMOVED***ociated with roleId ' + roleId + ' does not exist'));

      req.role = role._id;
      next();
    });
  }

  var validateTeamParams = function(req, res, next) {
    var teamIds = req.param('teamIds');
    if (!teamIds) {
      return res.send(400, "Cannot set teams, 'teamIds' param not specified");
    }

    var teamIds = teamIds.split(",");
    var validatedTeams = [];
    Team.getTeams(function (err, validTeams) {
      teamIds.forEach(function(teamId) {
        var found = validTeams.some(function(validTeam) {
          return (teamId === validTeam._id.toString());
        });


        if (!found) {
          return res.send(400, "Team '" + teamId + "' is not a valid team id");
        }

        validatedTeams.push(teamId);
      });

      req.teamIds = validatedTeams;
      next();
    });
  }

  // login
  app.post(
    '/api/login',
    p***REMOVED***port.authenticate(strategy),
    function(req, res) {
       Token.createTokenForUser(req.user, function(err, token) {
        if (err) {
          return res.send("Error generating token", 400);
        }

        res.json({token: token.token});
      });
    }
  );

  // get all uses
  app.get(
    '/api/users', 
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('READ_USER'),
      function (req, res) {
      User.getUsers(function (users) {
        res.json(users);
      });
  });

  // get user by id
  app.get( 
    '/api/users/:userId',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('READ_USER'),
    function(req, res) {
     res.json(req.user);
    }
  );

  // Create a new user
  app.post(
    '/api/users',
    function(req, res) {
      var invalidResponse = function(param) {
        return "Cannot create user, invalid parameters.  '" + param + "' parameter is required";
      }

      var user = {};

      var username = req.param('username');
      if (!username) {
        return res.send(400, invalidResponse('username'));
      }
      user.username = username;

      var firstname = req.param('firstname');
      if (!firstname) {
        return res.send(400, invalidResponse('firstname'));
      }
      user.firstname = firstname;

      var lastname = req.param('lastname');
      if (!lastname) {
        return res.send(400, invalidResponse('lastname'));
      }
      user.lastname = lastname;

      var email = req.param('email');
      if (email) {
        user.email = email;
      }

      var p***REMOVED***word = req.param('p***REMOVED***word');
      if (!p***REMOVED***word) {
        res.send(400, invalidResponse('p***REMOVED***word'));
      }

      var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
      if (!p***REMOVED***wordconfirm) {
        res.send(400, invalidResponse('p***REMOVED***wordconfirm'));
      }

      if (p***REMOVED***word != p***REMOVED***wordconfirm) {
        res.send(400, 'p***REMOVED***words do not match');
      }

      user.p***REMOVED***word = p***REMOVED***word;

      User.createUser(user, function(err, newUser) {
        if (err) {
          return res.send(400, err);
        }

        res.json(newUser);
      });
    }
  );

  // Update a user
  app.put(
    '/api/users/:userId', 
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('UPDATE_USER'),
    function(req, res) {
      var update = {};
      if (req.param('username')) update.username = req.param('username');
      if (req.param('firstname')) update.firstname = req.param('firstname');
      if (req.param('lastname')) update.lastname = req.param('lastname');
      if (req.param('email')) update.email = req.param('email');

      var p***REMOVED***word = req.param('p***REMOVED***word');
      var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
      if (p***REMOVED***word && p***REMOVED***wordconfirm) {
        if (p***REMOVED***word != p***REMOVED***wordconfirm) {
          return res.send(400, 'p***REMOVED***words do not match');
        }

        update.p***REMOVED***word = p***REMOVED***word;
      }

      console.log('trying to update user' + JSON.stringify(update));
      User.updateUser(req.user._id, update, function(err, updatedUser) {
        if (err) {
          return res.send(400, err);
        }

        res.json(updatedUser);
      });
    }
  );

  // Delete a user
  app.delete(
    '/api/users/:userId', 
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('DELETE_USER'),
    function(req, res) {
      User.deleteUser(req.user, function(err, updatedUser) {
        if (err) {
          return res.send(400, err);
        }

        res.json(updatedUser);
      });
    }
  );

  // set role for user
  app.post(
    '/api/users/:userId/role',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('UPDATE_USER'),
    validateRoleParams,
    function(req, res) {
      User.setRoleForUser(req.user, req.role, function(err, user) {
        res.json(user);
      });
    }
  );

  // remove role from user
  app.delete(
    '/api/users/:userId/role',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('UPDATE_USER'),
    function(req, res) {
      User.removeRolesForUser(req.user, function(err, user) {
        res.json(user);
      })
    }
  );

  // set teams for users
  app.post(
    '/api/users/:userId/teams',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('UPDATE_USER'),
    validateTeamParams,
    function(req, res) {
      User.setTeamsForUser(req.user, req.teamIds, function(err, user) {
        res.json(user);
      });
    }
  );

  // remove all teams from user
  app.delete(
    '/api/users/:userId/teams',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('UPDATE_USER'),
    function(req, res) {
      User.removeTeamsForUser(req.user, function(err, user) {
        res.json(user);
      })
    }
  );
}