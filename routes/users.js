module.exports = function(app, security) {
  var api = require('../api')
    , User = require('../models/user')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access')
    , userTransformer = require('../transformers/user')
    , config = require('../config.json')
    , fs = require('fs-extra')
    , path = require('path')
    , p***REMOVED***port = security.authentication.p***REMOVED***port
    , loginStrategy = security.authentication.loginStrategy
    , authenticationStrategy = security.authentication.authenticationStrategy
    , provision = security.provisioning.provision
    , provisionStrategy = security.provisioning.strategy;

  var p***REMOVED***wordLength = config.api.authentication.p***REMOVED***wordMinLength;
  var emailRegex = /^[^\s@]+@[^\s@]+\./;

  var isAuthenticated = function(strategy) {
    return function(req, res, next) {
      p***REMOVED***port.authenticate(strategy, function(err, user, info) {
        if (err) return next(err);

        if (user) req.user = user;

        next();

      })(req, res, next);
    }
  }

  var isAuthorized = function(permission) {
    return function(req, res, next) {
      access.hasPermission(req.user, permission, function(err, hasPermission) {
        if (err) return next(err);

        if (!hasPermission) req.user = null;

        next();

      });
    }
  }

  var getDefaultRole = function(req, res, next) {
    Role.getRole('USER_ROLE', function(err, role) {
      req.role = role;
      next();
    });
  }

  var validateUser = function(req, res, next) {
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
      // validate they at least tried to enter a valid email
      if (!email.match(emailRegex)) {
        return res.send(400, 'Please enter a valid email address');
      }

      user.email = email;
    }

    var phone = req.param('phone');
    if (phone) {
      user.phones = [{
        type: "Main",
        number: phone
      }];
    }

    var p***REMOVED***word = req.param('p***REMOVED***word');
    if (!p***REMOVED***word) {
      return res.send(400, invalidResponse('p***REMOVED***word'));
    }

    var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
    if (!p***REMOVED***wordconfirm) {
      return res.send(400, invalidResponse('p***REMOVED***wordconfirm'));
    }

    if (p***REMOVED***word != p***REMOVED***wordconfirm) {
      return res.send(400, 'p***REMOVED***words do not match');
    }

    if (p***REMOVED***word.length < p***REMOVED***wordLength) {
      return res.send(400, 'p***REMOVED***word does not meet minimum length requirement of ' + p***REMOVED***wordLength + ' characters');
    }

    user.p***REMOVED***word = p***REMOVED***word;

    req.newUser = user;

    next();
  }

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
    p***REMOVED***port.authenticate(loginStrategy),
    provision.check(provisionStrategy),
    function(req, res) {
      req.user.userAgent = req.headers['user-agent'];
      req.user.mageVersion = req.param('mageVersion');
      new api.User().login(req.user, req.provisionedDevice, {userAgent: req.headers['user-agent'], version: req.param('mageVersion')}, function(err, token) {
        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()}),
          device: req.provisionedDevice
        });
      });
    }
  );

  // logout
  app.post(
    '/api/logout',
    isAuthenticated(authenticationStrategy),
    function(req, res, next) {
      if (!req.user) {
        res.send(200, 'not logged in');
      }

      Token.removeTokenForUser(req.user, function(err, token){
        if (err) return next(err);

        res.send(200, 'successfully logged out');
      });
    }
  );

  // get all uses
  app.get(
    '/api/users',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('READ_USER'),
    function(req, res) {
      User.getUsers(function (users) {
        users = userTransformer.transform(users, {path: req.getRoot()});
        res.json(users);
      });
  });

  // get info for the user bearing a token, i.e get info for myself
  app.get(
    '/api/users/myself',
    p***REMOVED***port.authenticate(authenticationStrategy),
    function(req, res) {
      var user = userTransformer.transform(req.user, {path: req.getRoot()});
      res.json(user);
    }
  );

  // get user by id
  app.get(
    '/api/users/:userId',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('READ_USER'),
    function(req, res) {
      User.getUserById(req.params.userId, function(err, user) {
        if (err) return next(err);

        if (!user) return res.send(404);

        user = userTransformer.transform(user, {path: req.getRoot()});
        res.json(user);
      })
    }
  );

  // get user avatar by id
  app.get(
    '/api/users/:userId/avatar',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('READ_USER'),
    function(req, res) {
      new api.User().avatar(req.user, function(err, avatar) {
        if (err) return next(err);

        if (!avatar) return res.send(404);

        var stream = fs.createReadStream(avatar.path);
        stream.on('open', function() {
          res.type(avatar.contentType);
          res.header('Content-Length', avatar.size);
          stream.pipe(res);
        });
        stream.on('error', function(err) {
          console.log('error', err);
          res.send(404);
        });
      });
    }
  );

  // update myself
  app.put(
    '/api/users/myself',
    p***REMOVED***port.authenticate(authenticationStrategy),
    function(req, res, next) {
      var user = req.user;
      if (req.param('username')) user.username = req.param('username');
      if (req.param('firstname')) user.firstname = req.param('firstname');
      if (req.param('lastname')) user.lastname = req.param('lastname');
      if (req.param('email')) user.email = req.param('email');

      var phone = req.param('phone');
      if (phone) {
        user.phones = [{
          type: "Main",
          number: phone
        }];
      }

      var p***REMOVED***word = req.param('p***REMOVED***word');
      var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
      if (p***REMOVED***word && p***REMOVED***wordconfirm) {
        if (p***REMOVED***word != p***REMOVED***wordconfirm) {
          return res.send(400, 'p***REMOVED***words do not match');
        }

        if (p***REMOVED***word.length < p***REMOVED***wordLength) {
          return res.send(400, 'p***REMOVED***word does not meet minimum length requirment of ' + p***REMOVED***wordLength + ' characters');
        }

        user.p***REMOVED***word = p***REMOVED***word;
      }

      new api.User().update(user, {avatar: req.files.avatar}, function(err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  // Create a new user (ADMIN)
  // If authentication for admin fails go to next route and
  // create user as non-admin, roles will be empty
  app.post(
    '/api/users',
    isAuthenticated(authenticationStrategy),
    isAuthorized('UPDATE_USER'),
    validateUser,
    function(req, res, next) {
      // If I did not authenticate a user go to the next route
      // '/api/users' route which does not require authentication
      if (!req.user) return next();

      var role = req.param('role');
      if (!role) return res.send(400, 'role is a required field');
      req.newUser.role = role;

      // Authorized to update users, activate account by default
      req.newUser.active = true;

      User.createUser(req.newUser, function(err, newUser) {
        if (err) return res.send(400, err.message);

        newUser = userTransformer.transform(newUser, {path: req.getRoot()});
        res.json(newUser);
      });
    }
  );

  // Create a new user
  // Anyone can create a new user, but the new user will not be active
  app.post(
    '/api/users',
    getDefaultRole,
    validateUser,
    function(req, res) {
      req.newUser.active = false;
      req.newUser.role = req.role._id;

      User.createUser(req.newUser, function(err, newUser) {
        if (err) return res.send(400, err.message);

        newUser = userTransformer.transform(newUser, {path: req.getRoot()});
        res.json(newUser);
      });
    }
  );

  // update status for myself
  app.put(
    '/api/users/myself/status',
    p***REMOVED***port.authenticate(authenticationStrategy),
    function(req, res) {
      var status = req.param('status');
      if (!status) return res.send(400, "Missing required parameter 'status'");

      var update = {status: status};
      User.updateUser(req.user._id, update, function(err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  // remove status for myself
  app.delete(
    '/api/users/myself/status',
    p***REMOVED***port.authenticate(authenticationStrategy),
    function(req, res) {
      var status = req.param.status;

      var update = {$unset: {status: 1}};
      User.updateUser(req.user._id, update, function(err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  // Update a specific user
  app.put(
    '/api/users/:userId',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('UPDATE_USER'),
    function(req, res) {
      User.getUserById(req.params.userId, function(err, user) {
        if (err) return res.send(400, 'User not found');
        if (req.param('active')) user.active = req.param('active');
        user.username = req.param('username');
        user.firstname = req.param('firstname');
        user.lastname = req.param('lastname');
        user.email = req.param('email');
        if (req.param('role')) user.role = req.param('role');
        var phone = req.param('phone');
        if (phone) {
          user.phones = [{
            type: "Main",
            number: phone
          }];
        }

        var p***REMOVED***word = req.param('p***REMOVED***word');
        var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
        if (p***REMOVED***word && p***REMOVED***wordconfirm) {
          if (p***REMOVED***word != p***REMOVED***wordconfirm) {
            return res.send(400, 'p***REMOVED***words do not match');
          }

          if (p***REMOVED***word.length < p***REMOVED***wordLength) {
            return res.send(400, 'p***REMOVED***word does not meet minimum length requirement of ' + p***REMOVED***wordLength + ' characters');
          }

          user.p***REMOVED***word = p***REMOVED***word;
        }

        User.updateUser(user, function(err, updatedUser) {
          console.log('error', err);
          if (err) return res.send(400, "Error updating user, " + err.toString());

          updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
          res.json(updatedUser);
        });
      });
    }
  );

  // Delete a specific user
  app.delete(
    '/api/users/:userId',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('DELETE_USER'),
    function(req, res) {
      User.deleteUser(req.params.userId, function(err, user) {
        if (err) {
          return res.send(400, err);
        }

        res.send(200);
      });
    }
  );

  // set role for user
  app.post(
    '/api/users/:userId/role',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('UPDATE_USER'),
    validateRoleParams,
    function(req, res) {
      User.setRoleForUser(req.user, req.role, function(err, user) {
        user = userTransformer.transform(user, {path: req.getRoot()});
        res.json(user);
      });
    }
  );

  // set teams for users
  app.post(
    '/api/users/:userId/teams',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('UPDATE_USER'),
    validateTeamParams,
    function(req, res) {
      User.setTeamsForUser(req.user, req.teamIds, function(err, user) {
        user = userTransformer.transform(user, {path: req.getRoot()});
        res.json(user);
      });
    }
  );

  // remove all teams from user
  app.delete(
    '/api/users/:userId/teams',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('UPDATE_USER'),
    function(req, res) {
      User.removeTeamsForUser(req.user, function(err, user) {
        user = userTransformer.transform(user, {path: req.getRoot()});
        res.json(user);
      })
    }
  );
}
