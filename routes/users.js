module.exports = function (app, security) {
  const crypto = require('crypto')
    , hasher = require('../utilities/pbkdf2')()
    , svgCaptcha = require('svg-captcha')
    , log = require('winston')
    , fs = require('fs-extra')
    , Role = require('../models/role')
    , Event = require('../models/event')
    , Authentication = require('../models/authentication')
    , api = require('../api')
    , access = require('../access')
    , verification = require('../authentication/verification')
    , userTransformer = require('../transformers/user')
    , pageInfoTransformer = require('../transformers/pageinfo')
    , { default: upload } = require('../upload')
    , BearerStrategy = require('passport-http-bearer').Strategy
    , passport = security.authentication.passport;

  const emailRegex = /^[^\s@]+@[^\s@]+\./;
  const JWTService = verification.JWTService;
  const TokenAssertion = verification.TokenAssertion;
  const VerificationErrorReason = verification.VerificationErrorReason;
  const tokenService = new JWTService(crypto.randomBytes(64).toString('hex'), 'urn:mage');

  passport.use('captcha', new BearerStrategy(function (token, done) {
    const expectation = {
      assertion: TokenAssertion.Captcha
    };

    tokenService.verifyToken(token, expectation)
      .then(payload => done(null, payload))
      .catch(err => done(err));
  }));

  function isAuthenticated(strategy) {
    return function (req, res, next) {
      passport.authenticate(strategy, function (err, user) {
        if (err) return next(err);
        if (user) req.user = user;
        next();

      })(req, res, next);
    };
  }

  function parseIconUpload(req, res, next) {
    let iconMetadata = req.param('iconMetadata') || {};
    if (typeof iconMetadata === 'string' || iconMetadata instanceof String) {
      iconMetadata = JSON.parse(iconMetadata);
    }

    const files = req.files || {};
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
      files.icon = [icon];
    }

    next();
  }

  function validateUsername(req, res, next) {
    let username = req.param('username');
    if (!username) {
      return res.status(400).send("Invalid user document: missing required parameter 'username'");
    }
    username = username.trim();

    req.username = username;

    next();
  }

  /**
   * * TODO: express.Request.param() is deprecated
   *   https://expressjs.com/en/4x/api.html#req.param
   * * TODO: seems like a lot of duplication of the PUT /api/users/{userId}
   *   route.
   */
  function validateAccount(req, res, next) {

    function missingRequired(param) {
      return `Invalid account document: missing required parameter '${param}'`;
    }

    const account = {};

    const displayName = req.param('displayName');
    if (!displayName) {
      return res.status(400).send(missingRequired('displayName'));
    }
    account.displayName = displayName;

    const email = req.param('email');
    if (email) {
      // validate they at least tried to enter a valid email
      if (!email.match(emailRegex)) {
        return res.status(400).send('Invalid email address');
      }
      account.email = email;
    }

    const phone = req.param('phone');
    if (phone) {
      account.phones = [{
        type: 'Main',
        number: phone
      }];
    }

    const password = req.body.password;
    if (!password) {
      return res.status(400).send(missingRequired('password'));
    }

    const passwordconfirm = req.body.passwordconfirm;
    if (!passwordconfirm) {
      return res.status(400).send(missingRequired('passwordconfirm'));
    }

    if (password !== passwordconfirm) {
      return res.status(400).send('Passwords do not match');
    }

    account.password = password;
    req.account = account;
    next();
  }

  // Create a new user (ADMIN)
  // If authentication for admin fails go to next route and
  // create user as non-admin, roles will be empty
  app.post(
    '/api/users',
    isAuthenticated('bearer'),
    access.authorize('CREATE_USER'),
    upload.fields([{ name: 'avatar' }, { name: 'icon' }]),
    validateUsername,
    validateAccount,
    parseIconUpload,
    function (req, res, next) {
      const roleId = req.param('roleId');
      if (!roleId) return res.status(400).send('roleId is a required field');

      const user = {
        username: req.username,
        roleId: roleId,
        active: true, // Authorized to update users, activate account by default
        displayName: req.account.displayName,
        email: req.account.email,
        phones: req.account.phones,
        authentication: {
          type: 'local',
          password: req.account.password,
          authenticationConfiguration: {
            name: 'local'
          }
        }
      };

      const files = req.files || {};
      const [avatar] = files.avatar || [];
      const [icon] = files.icon || [];
      new api.User().create(user, { avatar, icon }).then(newUser => {
        newUser = userTransformer.transform(newUser, { path: req.getRoot() });
        res.json(newUser);
      }).catch(err => next(err));
    }
  );

  // Create a new user
  // Anyone can create a new user, but the new user will not be active
  app.post(
    '/api/users/signups',
    validateUsername,
    function (req, res, next) {
      const background = req.body.background || '#FFFFFF';
      const captcha = svgCaptcha.create({
        size: 6,
        noise: 4,
        color: false,
        background: background.toLowerCase() !== '#ffffff' ? background : null
      });

      hasher.hashPassword(captcha.text, (err, hash) => {
        if (err) return next(err);

        const claims = {
          captcha: hash
        };

        tokenService.generateToken(req.username, TokenAssertion.Captcha, 60 * 3, claims).then(token => {
          res.json({
            token: token,
            captcha: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`
          });
        }).catch(err => {
          next(err);
        });
      })
    }
  );

  app.post(
    '/api/users/signups/verifications',
    validateAccount,
    function verify(req, res, next) {
      passport.authenticate('captcha', (err, payload) => {
        if (err) {
          const status = err.reason === VerificationErrorReason.Expired ? 401 : 400;
          return res.status(status).send("Invalid captcha, please try again");
        }
        if (!payload) return res.sendStatus(400);

        req.payload = payload;
        next();
      })(req, res, next);
    },
    function role(req, res, next) {
      Role.getRole('USER_ROLE', (err, role) => {
        req.userRole = role;
        next(err);
      });
    },
    function (req, res, next) {
      hasher.validPassword(req.body.captchaText, req.payload.captcha, (err, valid) => {
        if (err) return next(err);

        if (!valid) {
          return res.status(403).send('Invalid captcha, please try again.');
        }

        const user = {
          username: req.payload.subject,
          roleId: req.userRole._id,
          displayName: req.account.displayName,
          email: req.account.email,
          phones: req.account.phones,
          authentication: {
            type: 'local',
            password: req.account.password,
            authenticationConfiguration: {
              name: 'local'
            }
          }
        };

        new api.User().create(user).then(newUser => {
          newUser = userTransformer.transform(newUser, { path: req.getRoot() });
          res.json(newUser);
        }).catch(err => {
          next(err)
        });
      })
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

      if (req.query) {
        for (let [key, value] of Object.entries(req.query)) {
          if (key == 'populate' || key == 'limit' || key == 'start' || key == 'sort' || key == 'forceRefresh') {
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

      new api.User().getAll({ filter: filter, populate: populate, limit: limit, start: start, sort: sort }, function (err, users, pageInfo) {
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

      if (req.query) {
        for (let [key, value] of Object.entries(req.query)) {
          if (key == 'populate' || key == 'limit' || key == 'start' || key == 'sort' || key == 'forceRefresh') {
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
        return res.sendStatus(404);
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

      req.user.authentication.password = password

      Authentication.updateAuthentication(req.user.authentication).then(() => {
        res.sendStatus(200);
      }).catch(err => next(err));
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
      const files = req.files || {};
      const [avatar] = files.avatar || [];
      const [icon] = files.icon || [];
      new api.User().update(user, { avatar, icon }, function (err, updatedUser) {
        if (err) return next(err);

        updatedUser = userTransformer.transform(updatedUser, { path: req.getRoot() });
        res.json(updatedUser);
      });
    }
  );

  // Update a specific user's password
  // Need UPDATE_USER_PASSWORD to change a users password
  // TODO this needs to be update to use the UPDATE_USER_PASSWORD permission when Android is updated to handle that permission
  app.put(
    '/api/users/:userId/password',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_USER_ROLE'),
    function (req, res, next) {
      const user = req.userParam;

      if (user.authentication.type !== 'local') {
        return res.sendStatus(404);
      }

      const password = req.param('password');
      const passwordconfirm = req.param('passwordconfirm');
      if (!password) {
        return res.status(400).send('password is required');
      }

      if (!passwordconfirm) {
        return res.status(400).send('passwordconfirm is required');
      }

      if (password !== passwordconfirm) {
        return res.status(400).send('Passwords do not match');
      }

      user.authentication.password = password;

      Authentication.updateAuthentication(user.authentication).then(() => {
        res.sendStatus(200);
      }).catch(err => next(err));
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
