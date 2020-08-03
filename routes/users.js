module.exports = function (app, security) {
  const api = require('../api')
    , log = require('winston')
    , Role = require('../models/role')
    , Setting = require('../models/setting')
    , Event = require('../models/event')
    , access = require('../access')
    , fs = require('fs-extra')
    , userTransformer = require('../transformers/user')
    , pageInfoTransformer = require('../transformers/pageinfo')
    , { default: upload } = require('../upload')
    , passport = security.authentication.passport
    , passwordValidator = require('../utilities/passwordValidator');

  const emailRegex = /^[^\s@]+@[^\s@]+\./;

  function isAuthenticated(strategy) {
    return function (req, res, next) {
      passport.authenticate(strategy, function (err, user) {
        if (err) return next(err);
        if (user) req.user = user;
        next();

      })(req, res, next);
    };
  }

  function defaultRole(req, res, next) {
    Role.getRole('USER_ROLE', function(err, role) {
      req.newUser.roleId = role._id;
      next();
    });
  }

  function parseIconUpload(req, res, next) {
    var iconMetadata = req.param('iconMetadata') || {};
    if (typeof iconMetadata === 'string' || iconMetadata instanceof String) {
      iconMetadata = JSON.parse(iconMetadata);
    }

    let files = req.files || {};
    let [icon] = files.icon || [];
    if (icon) {
      // default type to upload
      if (!iconMetadata.type) iconMetadata.type = 'upload';

      if (iconMetadata.type !== 'create' && iconMetadata.type !== 'upload') {
        return res.status(400).send('invalid icon metadata');
      }

      icon.type = iconMetadata.type;
      icon.text = iconMetadata.text;
      icon.color = iconMetadata.color;
    } else if (iconMetadata.type === 'none') {
      icon = {
        type: 'none'
      };
    }

    next();
  }

  /**
   * * TODO: express.Request.param() is deprecated
   *   https://expressjs.com/en/4x/api.html#req.param
   * * TODO: seems like a lot of duplication of the PUT /api/users/{userId}
   *   route.
   */
  function validateUser(req, res, next) {

    function missingRequired(param) {
      return `Invalid user document: missing required parameter '${param}'`;
    }

    const user = {};

    const username = req.param('username');
    if (!username) {
      return res.status(400).send(missingRequired('username'));
    }
    user.username = username.trim();

    const displayName = req.param('displayName');
    if (!displayName) {
      return res.status(400).send(missingRequired('displayName'));
    }
    user.displayName = displayName;

    const email = req.param('email');
    if (email) {
      // validate they at least tried to enter a valid email
      if (!email.match(emailRegex)) {
        return res.status(400).send('Invalid email address');
      }
      user.email = email;
    }

    const phone = req.param('phone');
    if (phone) {
      user.phones = [{
        type: "Main",
        number: phone
      }];
    }

    const password = req.param('password');
    if (!password) {
      return res.status(400).send(missingRequired('password'));
    }

    const passwordconfirm = req.param('passwordconfirm');
    if (!passwordconfirm) {
      return res.status(400).send(missingRequired('passwordconfirm'));
    }

    if (password !== passwordconfirm) {
      return res.status(400).send('Passwords do not match');
    }

    passwordValidator.validate('local', password).then(validationStatus => {
      if(!validationStatus.isValid) {
        return res.status(400).send(validationStatus.msg);
      }

      user.authentication = {
        type: 'local',
        password: password
      };
  
      req.newUser = user;
      next();
    }).catch(err => {
      log.warn('Error during password validation' + err);
    });
  }

  function setDefaults(req, res, next) {
    const authenticationType = req.newUser.authentication.type;

    req.newUser.active = false;
    Setting.getSetting('security').then((security = {}) => {
      const settings = security.settings || {};
      if (settings[authenticationType]) {
        const requireAdminActivation = settings[authenticationType].usersReqAdmin;
        if (requireAdminActivation) {
          req.newUser.active = !requireAdminActivation.enabled;
        }

        req.defaultTeams = settings[authenticationType].newUserTeams;
        req.defaultEvents = settings[authenticationType].newUserEvents;
      }

      next();
    });
  }

  // Create a new user (ADMIN)
  // If authentication for admin fails go to next route and
  // create user as non-admin, roles will be empty
  app.post(
    '/api/users',
    isAuthenticated('bearer'),
    upload.fields([{ name: 'avatar' }, { name: 'icon' }]),
    validateUser,
    parseIconUpload,
    function (req, res, next) {
      // If I did not authenticate a user go to the next route
      // '/api/users' route which does not require authentication
      if (!access.userHasPermission(req.user, 'CREATE_USER')) {
        return next();
      }

      const roleId = req.param('roleId');

      if (!roleId) return res.status(400).send('roleId is a required field');
      req.newUser.roleId = roleId;

      // Authorized to update users, activate account by default
      req.newUser.active = true;

      const files = req.files || {};
      const [avatar] = files.avatar || [];
      const [icon] = files.icon || [];
      new api.User().create(req.newUser, { avatar, icon }, function(err, newUser) {
        if (err) return next(err);

        newUser = userTransformer.transform(newUser, { path: req.getRoot() });
        res.json(newUser);
      });
    }
  );

  // Create a new user
  // Anyone can create a new user, but the new user will not be active
  app.post(
    '/api/users',
    validateUser,
    defaultRole,
    setDefaults,
    function(req, res, next) {
      const { defaultTeams, defaultEvents } = req;
      new api.User().create(req.newUser, { defaultTeams, defaultEvents }, function(err, newUser) {
        if (err) return next(err);

        newUser = userTransformer.transform(newUser, { path: req.getRoot() });
        res.json(newUser);
      });
    }
  );

  /**
   * TODO:
   * * openapi supports array query parameters using the pipe `|` delimiter;
   *   use that instead of comma for the `populate` query param. on the other hand,
   *   this only actually supports a singular `populate` key, so why bother with
   *   the split anyway?
   */
  app.get(
    '/api/users',
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function (req, res, next) {
      var filter = {};

      if(req.query) {
        for (let [key, value] of Object.entries(req.query)) {
          if(key == 'populate' || key == 'limit' || key == 'start' || key == 'sort' || key == 'forceRefresh'){
            continue;
          }
          filter[key] = value;
        }
      }

      var populate = null;
      if (req.query.populate) {
        populate = req.query.populate.split(",");
      }

      var limit = null;
      if (req.query.limit) {
        limit = req.query.limit;
      }

      var start = null;
      if (req.query.start) {
        start = req.query.start;
      }

      var sort = null;
      if (req.query.sort) {
        sort = req.query.sort;
      }

      new api.User().getAll({ filter: filter, populate: populate, limit: limit, start: start, sort: sort}, function (err, users, pageInfo) {
        if (err) return next(err);

        let data = null;

        if (pageInfo != null) {
          data = pageInfoTransformer.transform(pageInfo, req);
          data.users = userTransformer.transform(users, { path: req.getRoot() });
        } else {
          data = userTransformer.transform(users, { path: req.getRoot() });
        }

        res.json(data);
      });
    }
  );

  app.get(
    '/api/users/count',
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function (req, res, next) {
      var filter = {};

      if(req.query) {
        for (let [key, value] of Object.entries(req.query)) {
          if(key == 'populate' || key == 'limit' || key == 'start' || key == 'sort' || key == 'forceRefresh'){
            continue;
          }
          filter[key] = value;
        }
      }

      new api.User().count({ filter: filter }, function (err, count) {
        if (err) return next(err);

        res.json({ count: count });
      });
    }
  );

  // get info for the user bearing a token, i.e get info for myself
  app.get(
    '/api/users/myself',
    passport.authenticate('bearer'),
    function (req, res) {
      var user = userTransformer.transform(req.user, { path: req.getRoot() });
      res.json(user);
    }
  );

  // TODO: should be patch
  // update myself
  app.put(
    '/api/users/myself',
    passport.authenticate('bearer'),
    upload.single('avatar'),
    function (req, res, next) {
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

      new api.User().update(req.user, { avatar: req.file }, function (err, updatedUser) {
        if (err) return next(err);

        updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
        res.json(updatedUser);
      });
    }
  );

  app.put(
    '/api/users/myself/password',
    passport.authenticate('local'),
    function (req, res, next) {
      if (req.user.authentication.type !== 'local') {
        return res.status(400).send('User does not use local authentication');
      }
      const password = req.param('newPassword');
      const confirm = req.param('newPasswordConfirm');
      if (!password) {
        return res.status(400).send('newPassword is required');
      }
      if (!confirm) {
        return res.status(400).send('newPasswordConfirm is required');
      }
      if (password !== confirm) {
        return res.status(400).send('Passwords do not match');
      }
      passwordValidator.validate('local', password).then(validationStatus => {
        if(!validationStatus.isValid) {
          return res.status(400).send(validationStatus.msg);
        }
        req.user.authentication = {
          type: 'local',
          password: password
        };
        new api.User().update(req.user, function (err, updatedUser) {
          if (err) {
            return next(err);
          }
          updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
          res.json(updatedUser);
        });
      });
    }
  );

  // update status for myself
  app.put(
    '/api/users/myself/status',
    passport.authenticate('bearer'),
    function (req, res) {
      var status = req.param('status');
      if (!status) return res.status(400).send("Missing required parameter 'status'");
      req.user.status = status;

      new api.User().update(req.user, function (err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
        res.json(updatedUser);
      });
    }
  );

  // remove status for myself
  app.delete(
    '/api/users/myself/status',
    passport.authenticate('bearer'),
    function (req, res) {
      req.user.status = undefined;
      new api.User().update(req.user, function (err, updatedUser) {
        updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
        res.json(updatedUser);
      });
    }
  );

  // get user by id
  app.get(
    '/api/users/:userId',
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function (req, res) {
      var user = userTransformer.transform(req.userParam, { path: req.getRoot() });
      res.json(user);
    }
  );

  // Update a specific user
  app.put(
    '/api/users/:userId',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_USER'),
    upload.fields([{ name: 'avatar' }, { name: 'icon' }]),
    parseIconUpload,
    function (req, res, next) {
      const user = req.userParam;

      if (req.param('username')) user.username = req.param('username');
      if (req.param('displayName')) user.displayName = req.param('displayName');
      if (req.param('email')) user.email = req.param('email');

      if (req.param('active') === true || req.param('active') === 'true') {
        user.active = true;
      }

      if (req.param('enabled') === true || req.param('enabled') === 'true') {
        user.enabled = true;
      } else if (req.param('enabled') === false || req.param('enabled') === 'false') {
        user.enabled = false;
      }

      // Need UPDATE_USER_ROLE to change a users role
      if (req.param('roleId') && access.userHasPermission(req.user, 'UPDATE_USER_ROLE')) {
        user.roleId = req.param('roleId');
      }

      const phone = req.param('phone');
      if (phone) {
        user.phones = [{
          type: "Main",
          number: phone
        }];
      }

      const password = req.param('password');
      if (password && user.authentication.type === 'local') {
        const confirm = req.param('passwordconfirm');
        if (!confirm) {
          return res.status(400).send(`Invalid user document: missing required parameter 'passwordconfirm'`)
        }
        else if (password !== confirm) {
          return res.status(400).send('passwords do not match');
        }

        passwordValidator.validate('local', password).then(validationStatus => {
          if (!validationStatus.isValid) {
            return res.status(400).send(validationStatus.msg);
          }

          // Need UPDATE_USER_PASSWORD to change a users password
          // TODO this needs to be update to use the UPDATE_USER_PASSWORD permission when Android is updated to handle that permission
          if (access.userHasPermission(req.user, 'UPDATE_USER_ROLE')) {
            user.authentication.password = password;
          }

          const files = req.files || {};
          const [avatar] = files.avatar || [];
          const [icon] = files.icon || [];
          new api.User().update(user, { avatar, icon }, function (err, updatedUser) {
            if (err) return next(err);
    
            updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
            res.json(updatedUser);
          });
        });
      } else {
        const files = req.files || {};
        const [avatar] = files.avatar || [];
        const [icon] = files.icon || [];
        new api.User().update(user, { avatar, icon }, function (err, updatedUser) {
          if (err) return next(err);
  
          updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
          res.json(updatedUser);
        });
      }
    }
  );

  // Delete a specific user
  app.delete(
    '/api/users/:userId',
    passport.authenticate('bearer'),
    access.authorize('DELETE_USER'),
    function (req, res, next) {
      new api.User().delete(req.userParam, function (err) {
        if (err) return next(err);

        res.sendStatus(204);
      });
    }
  );

  // get user avatar/icon by id
  app.get(
    '/api/users/:userId/:content(avatar|icon)',
    passport.authenticate('bearer'),
    access.authorize('READ_USER'),
    function (req, res, next) {
      new api.User()[req.params.content](req.userParam, function (err, content) {
        if (err) return next(err);

        if (!content) return res.sendStatus(404);

        var stream = fs.createReadStream(content.path);
        stream.on('open', function () {
          res.type(content.contentType);
          res.header('Content-Length', content.size);
          stream.pipe(res);
        });
        stream.on('error', function () {
          res.sendStatus(404);
        });
      });
    }
  );

  app.post(
    '/api/users/:userId/events/:eventId/recent',
    passport.authenticate('bearer'),
    function (req, res, next) {
      if (access.userHasPermission(req.user, 'UPDATE_EVENT')) {
        next();
      } else {
        Event.userHasEventPermission(req.event, req.user._id, 'read', function (err, hasPermission) {
          hasPermission ? next() : res.sendStatus(403);
        });
      }
    },
    function (req, res, next) {
      new api.User().addRecentEvent(req.user, req.event, function (err, user) {
        if (err) return next(err);

        res.json(user);
      });
    }
  );

  // logout
  app.post(
    '/api/logout',
    isAuthenticated('bearer'),
    function (req, res, next) {
      if (req.user) {
        log.info('logout w/ user', req.user._id.toString());
        new api.User().logout(req.token, function (err) {
          if (err) return next(err);
          res.status(200).send('successfully logged out');
        });
      } else {
        // call to logout with an invalid token, nothing to do
        res.sendStatus(200);
      }
    }
  );
};
