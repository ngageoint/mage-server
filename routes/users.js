module.exports = function(app, security) {
  var api = require('../api')
    , log = require('winston')
    , Role = require('../models/role')
    , access = require('../access')
    , fs = require('fs-extra')
    , userTransformer = require('../transformers/user')
    , passport = security.authentication.passport;

  var passwordLength = null;
  Object.keys(security.authentication.strategies).forEach(function(name) {
    if (security.authentication.strategies[name].passwordMinLength) {
      passwordLength = security.authentication.strategies[name].passwordMinLength;
    }
  });

  var emailRegex = /^[^\s@]+@[^\s@]+\./;

  function isAuthenticated(strategy) {
    return function(req, res, next) {
      passport.authenticate(strategy, function(err, user) {
        if (err) return next(err);
        if (user) req.user = user;
        next();

      })(req, res, next);
    };
  }

  function getDefaultRole(req, res, next) {
    Role.getRole('USER_ROLE', function(err, role) {
      req.role = role;
      next();
    });
  }

  function parseIconUpload(req, res, next) {
    var iconMetadata = req.param('iconMetadata') || {};
    if (typeof iconMetadata === 'string' || iconMetadata instanceof String) {
      iconMetadata = JSON.parse(iconMetadata);
    }

    if (req.files.icon) {
      // default type to upload
      if (!iconMetadata.type) iconMetadata.type = 'upload';

      if (iconMetadata.type !== 'create' && iconMetadata.type !== 'upload') {
        return res.status(400).send('invalid icon metadata');
      }

      req.files.icon.type = iconMetadata.type;
      req.files.icon.text = iconMetadata.text;
      req.files.icon.color = iconMetadata.color;
    } else {
      if (iconMetadata.type === 'none') {
        req.files.icon = {
          type: 'none'
        };
      }
    }

    next();
  }

  function validateUser(req, res, next) {
    function invalidResponse(param) {
      return "Cannot create user, invalid parameters.  '" + param + "' parameter is required";
    }

    var user = {};

    var username = req.param('username');
    if (!username) {
      return res.status(400).send(invalidResponse('username'));
    }
    user.username = username.trim();

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

    req.newUser = user;

    next();
  }

  // logout
  app.post(
    '/api/logout',
    isAuthenticated('bearer'),
    function(req, res, next) {
      if (req.user) {
        log.info('logout w/ user', req.user._id.toString());
        new api.User().logout(req.token, function(err) {
          if (err) return next(err);
          res.status(200).send('successfully logged out');
        });
      } else {
        // call to logout with an invalid token, nothing to do
        res.sendStatus(200);
      }
    }
  );

  app.get(
    '/api/users/count',
    passport.authenticate('bearer'),
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
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      var filter = {};
      if (req.query.active === 'true' || req.query.active === 'false') {
        filter.active = req.query.active === 'true';
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
    }
  );

  // get info for the user bearing a token, i.e get info for myself
  app.get(
    '/api/users/myself',
    passport.authenticate('bearer'),
    function(req, res) {
      var user = userTransformer.transform(req.user, {path: req.getRoot()});
      res.json(user);
    }
  );

  // get user by id
  app.get(
    '/api/users/:userId',
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res) {
      var user = userTransformer.transform(req.userParam, {path: req.getRoot()});
      res.json(user);
    }
  );

  // get user avatar/icon by id
  app.get(
    '/api/users/:userId/:content(avatar|icon)',
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      new api.User()[req.params.content](req.userParam, function(err, content) {
        if (err) return next(err);

        if (!content) return res.sendStatus(404);

        var stream = fs.createReadStream(content.path);
        stream.on('open', function() {
          res.type(content.contentType);
          res.header('Content-Length', content.size);
          stream.pipe(res);
        });
        stream.on('error', function() {
          res.sendStatus(404);
        });
      });
    }
  );

  // update myself
  app.put(
    '/api/users/myself',
    passport.authenticate('bearer'),
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

      new api.User().update(req.user, {avatar: req.files.avatar}, function(err, updatedUser) {
        if (err) return next(err);

        updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
        res.json(updatedUser);
      });
    }
  );

  app.put(
    '/api/users/myself/password',
    passport.authenticate('local'),
    function(req, res, next) {
      if (req.user.authentication.type === 'local') {
        var password = req.param('newPassword');
        var passwordconfirm = req.param('newPasswordConfirm');

        if (!password) {
          return res.status(400).send('newPassword is required');
        }

        if (!passwordconfirm) {
          return res.status(400).send('newPasswordConfirm is required');
        }

        if (password && passwordconfirm) {
          if (password !== passwordconfirm) {
            return res.status(400).send('passwords do not match');
          }

          if (password.length < passwordLength) {
            return res.status(400).send('password does not meet minimum length requirment of ' + passwordLength + ' characters');
          }

          req.user.authentication = {
            type: 'local',
            password: password
          };
        }

        new api.User().update(req.user, function(err, updatedUser) {
          if (err) return next(err);

          updatedUser = userTransformer.transform(updatedUser, {path: req.getRoot()});
          res.json(updatedUser);
        });
      } else {
        return res.status(400).send('no local password, cannot update.');
      }
    }
  );

  // Create a new user (ADMIN)
  // If authentication for admin fails go to next route and
  // create user as non-admin, roles will be empty
  app.post(
    '/api/users',
    isAuthenticated('bearer'),
    validateUser,
    parseIconUpload,
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
    passport.authenticate('bearer'),
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
    passport.authenticate('bearer'),
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
    passport.authenticate('bearer'),
    access.authorize('UPDATE_USER'),
    parseIconUpload,
    function(req, res, next) {
      var user = req.userParam;

      if (req.param('username')) user.username = req.param('username');
      if (req.param('displayName')) user.displayName = req.param('displayName');
      if (req.param('email')) user.email = req.param('email');
      if (req.param('active') === 'true' || req.param('active') === 'false') user.active = req.param('active');
      if (req.param('roleId')) user.roleId = req.param('roleId');

      var phone = req.param('phone');
      if (phone) {
        user.phones = [{
          type: "Main",
          number: phone
        }];
      }

      var password = req.param('password');
      var passwordconfirm = req.param('passwordconfirm');
      if (user.authentication.type === 'local' && password && passwordconfirm)  {
        if (password !== passwordconfirm) {
          return res.status(400).send('passwords do not match');
        } else if (password.length < passwordLength) {
          return res.status(400).send('password does not meet minimum length requirment of ' + passwordLength + ' characters');
        }

        user.authentication.password = password;
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
    passport.authenticate('bearer'),
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
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function(req, res, next) {
      new api.User().addRecentEvent(req.user, req.event, function(err, user) {
        if (err) return next(err);

        res.json(user);
      });
    }
  );

};
