module.exports = function(app, security) {
  var api = require('../api')
    , log = require('winston')
    , Role = require('../models/role')
    , access = require('../access')
    , config = require('../config.json')
    , fs = require('fs-extra')
    , userTransformer = require('../transformers/user')
    , p***REMOVED***port = security.authentication.p***REMOVED***port

  var p***REMOVED***wordLength = null;
  Object.keys(security.authentication.strategies).forEach(function(name) {
    if (security.authentication.strategies[name].p***REMOVED***wordLength) {
      p***REMOVED***wordLength = strategy.p***REMOVED***wordMinLength
    }
  });

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
      return res.status(400).send(invalidResponse('username'));
    }
    user.username = username;

    var displayName = req.param('displayName');
    if (!displayName) {
      return res.status(400).send(invalidResponse('displayName'));
    }
    user.displayName = displayName;

    var email = req.param('email');
    if (email) {
      // validate they at least tried to enter a valid email
      if (!email.match(emailRegex)) {
        return res.status(400).send('Please enter a valid email address');
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
      return res.status(400).send(invalidResponse('p***REMOVED***word'));
    }

    var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
    if (!p***REMOVED***wordconfirm) {
      return res.status(400).send(invalidResponse('p***REMOVED***wordconfirm'));
    }

    if (p***REMOVED***word != p***REMOVED***wordconfirm) {
      return res.status(400).send('p***REMOVED***words do not match');
    }

    if (p***REMOVED***word.length < p***REMOVED***wordLength) {
      return res.status(400).send('p***REMOVED***word does not meet minimum length requirement of ' + p***REMOVED***wordLength + ' characters');
    }

    user.p***REMOVED***word = p***REMOVED***word;

    req.newUser = user;

    next();
  }

  var validateRoleParams = function(req, res, next) {
    var roleId = req.param('roleId');
    if (!roleId) {
      return res.status(400).send("Cannot set role, 'roleId' param not specified");
    }

    Role.getRoleById(roleId, function(err, role) {
      if (err) return next(err);

      if (!role) return next(new Error('Role ***REMOVED***ociated with roleId ' + roleId + ' does not exist'));

      req.role = role;
      next();
    });
  }

  // logout
  app.post(
    '/api/logout',
    isAuthenticated('bearer'),
    function(req, res, next) {
      log.info('logout w/ token', req.token);
      new api.User().logout(req.token, function(err) {
        if (err) return next(err);
        res.status(200).send('successfully logged out');
      });
    }
  );

  app.get(
    '/api/users/count',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      new api.User().count(function(err, count) {
        if (err) return next(err);

        res.json({count: count});
      });
    }
  );

  // get all uses
  app.get(
    '/api/users',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      var filter = {};
      if (req.query.active === 'true') {
        filter.active = true;
      }
      if (req.query.active === 'false') {
        filter.active = false;
      }

      var populate = null;
      if (req.query.populate) {
        populate = req.query.populate.split(",");
      }

      new api.User().getAll({filter: filter, populate: populate}, function (err, users) {
        if (err) return next(err);

        users = userTransformer.transform(users, {path: req.getRoot()});
        res.json(users);
      });
  });

  // get info for the user bearing a token, i.e get info for myself
  app.get(
    '/api/users/myself',
    p***REMOVED***port.authenticate('bearer'),
    function(req, res) {
      var user = userTransformer.transform(req.user, {path: req.getRoot()});
      res.json(user);
    }
  );

  // get user by id
  app.get(
    '/api/users/:userId',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res) {
      user = userTransformer.transform(req.userParam, {path: req.getRoot()});
      res.json(user);
    }
  );

  // get user avatar/icon by id
  app.get(
    '/api/users/:userId/:content(avatar|icon)',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res) {
      new api.User()[req.params.content](req.userParam, function(err, content) {
        if (err) return next(err);

        if (!content) return res.sendStatus(404);

        var stream = fs.createReadStream(content.path);
        stream.on('open', function() {
          res.type(content.contentType);
          res.header('Content-Length', content.size);
          stream.pipe(res);
        });
        stream.on('error', function(err) {
          res.sendStatus(404);
        });
      });
    }
  );

  // update myself
  app.put(
    '/api/users/myself',
    p***REMOVED***port.authenticate('bearer'),
    function(req, res, next) {
      if (req.param('username')) req.user.username = req.param('username');
      if (req.param('displayName')) req.user.displayName = req.param('displayName');
      if (req.param('email')) req.user.email = req.param('email');

      var phone = req.param('phone');
      if (phone) {
        req.user.phones = [{
          type: "Main",
          number: phone
        }];
      }

      var p***REMOVED***word = req.param('p***REMOVED***word');
      var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
      if (p***REMOVED***word && p***REMOVED***wordconfirm) {
        if (p***REMOVED***word != p***REMOVED***wordconfirm) {
          return res.status(400).send('p***REMOVED***words do not match');
        }

        if (p***REMOVED***word.length < p***REMOVED***wordLength) {
          return res.status(400).send('p***REMOVED***word does not meet minimum length requirment of ' + p***REMOVED***wordLength + ' characters');
        }

        req.user.p***REMOVED***word = p***REMOVED***word;
      }

      new api.User().update(req.user, {avatar: req.files.avatar}, function(err, updatedUser) {
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
    isAuthenticated('bearer'),
    validateUser,
    function(req, res, next) {
      // If I did not authenticate a user go to the next route
      // '/api/users' route which does not require authentication
      if (!access.userHasPermission(req.user, 'CREATE_USER')) {
        return next();
      }

      var roleId = req.param('roleId');
      if (!roleId) return res.status(400).send('roleId is a required field');
      req.newUser.roleId = roleId;

      // Authorized to update users, activate account by default
      req.newUser.active = true;

      new api.User().create(req.newUser, {avatar: req.files.avatar, icon: req.files.icon}, function(err, newUser) {
        if (err) return next(err);

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
    function(req, res, next) {
      req.newUser.active = false;
      req.newUser.roleId = req.role._id;

      new api.User().create(req.newUser, {avatar: req.files.avatar}, function(err, newUser) {
        if (err) return next(err);

        newUser = userTransformer.transform(newUser, {path: req.getRoot()});
        res.json(newUser);
      });
    }
  );

  // update status for myself
  app.put(
    '/api/users/myself/status',
    p***REMOVED***port.authenticate('bearer'),
    function(req, res) {
      var status = req.param('status');
      if (!status) return res.status(400).send("Missing required parameter 'status'");
      req.user.status = status;

      new api.User().update(req.user, function(err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  // remove status for myself
  app.delete(
    '/api/users/myself/status',
    p***REMOVED***port.authenticate('bearer'),
    function(req, res) {
      req.user.status = undefined;
      new api.User().update(req.user, function(err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  // Update a specific user
  app.put(
    '/api/users/:userId',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('UPDATE_USER'),
    function(req, res, next) {
      var user = req.userParam;

      if (req.param('username')) user.username = req.param('username');
      if (req.param('displayName')) user.displayName = req.param('displayName');
      if (req.param('email')) user.email = req.param('email');
      if (req.param('active')) user.active = req.param('active');
      if (req.param('roleId')) user.roleId = req.param('roleId');

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
          return res.status(400).send('p***REMOVED***words do not match');
        }

        if (p***REMOVED***word.length < p***REMOVED***wordLength) {
          return res.status(400).send('p***REMOVED***word does not meet minimum length requirment of ' + p***REMOVED***wordLength + ' characters');
        }

        user.p***REMOVED***word = p***REMOVED***word;
      }

      new api.User().update(user, {avatar: req.files.avatar, icon: req.files.icon}, function(err, updatedUser) {
        if (err) return next(err);

        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  // Delete a specific user
  app.delete(
    '/api/users/:userId',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('DELETE_USER'),
    function(req, res, next) {
      new api.User().delete(req.userParam, function(err) {
        if (err) return next(err);

        res.sendStatus(204);
      });
    }
  );

  app.post(
    '/api/users/:userId/events/:eventId/recent',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      new api.User().addRecentEvent(req.user, req.event, function(err, user) {
        if (err) return next(err);

        res.json(user);
      });
    }
  );

  app.get(
    '/api/users/:userId/logins',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      var options = {};
      if (req.param('limit')) options.limit = req.param('limit');

      new api.User().getLogins(req.user, options, function(err, logins) {
        if (err) return next(err);

        res.json(logins);
      });
    }
  );

}
