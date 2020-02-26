module.exports = function (app, passport, provisioning, strategyConfig) {

  const log = require('winston')
    , SamlStrategy = require('passport-saml').Strategy
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , api = require('../api')
    , config = require('../config.js')
    , userTransformer = require('../transformers/user');

  const MAGE_SAML_SP_INITIATION_STATE = 'initiator=mage';
  strategyConfig.options.additionalParams = strategyConfig.options.additionalParams || {};
  strategyConfig.options.additionalParams.RelayState = MAGE_SAML_SP_INITIATION_STATE;

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  function isAuthenticated(req, res, next) {
    if (!req.user) {
      return res.sendStatus(401);
    }

    next();
  }

  function authorizeDevice(req, res, next) {
    provisioning.provision.check(provisioning.strategy, { uid: req.param('uid') }, function (err, device) {
      if (err) return next(err);

      if (provisioning.strategy === 'uid' && (!device || !device.registered)) {
        return res.sendStatus(403);
      } else {
        req.device = device;
        next();
      }
    })(req, res, next);
  }

  passport.use(new SamlStrategy(strategyConfig.options, function (profile, done) {
    const username = profile[strategyConfig.usernameAttribute];
    User.getUserByAuthenticationId('saml', username, function (err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function (err, role) {
          if (err) return done(err);

          var user = {
            username: username,
            displayName: profile[strategyConfig.displayNameAttribute],
            email: profile[strategyConfig.emailAttribute],
            active: false,
            roleId: role._id,
            authentication: {
              type: 'saml',
              id: username
            }
          };

          User.createUser(user, function (err, newUser) {
            return done(err, newUser);
          });
        });
      } else if (!user.active) {
        return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account." });
      } else {
        return done(null, user);
      }
    });
  }));

  app.get('/auth/saml/signin', passport.authenticate('saml'));

  function authenticate(req, res, next) {
    passport.authenticate('saml', function (err, user, info = {}) {
      if (err) return next(err);

      req.info = info;

      req.login(user, next);
    })(req, res, next);
  }

  function authorizeUser(req, res, next) {
    let token = req.param('access_token');

    if (req.user) {
      next();
    } else if (token) {
      log.warn('DEPRECATED - authorization with access_token has been deprecated, please use a session');
      next(new Error("Not supported"));
    }
  }

  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/saml/devices',
    authorizeUser,
    function (req, res, next) {
      var newDevice = {
        uid: req.param('uid'),
        name: req.param('name'),
        registered: false,
        description: req.param('description'),
        userAgent: req.headers['user-agent'],
        appVersion: req.param('appVersion'),
        userId: req.user.id
      };

      Device.getDeviceByUid(newDevice.uid)
        .then(device => {
          if (device) {
            // already exists, do not register
            return res.json(device);
          }

          Device.createDevice(newDevice)
            .then(device => res.json(device))
            .catch(err => next(err));
        })
        .catch(err => next(err));
    }
  );

  app.post(
    '/auth/saml/authorize',
    isAuthenticated,
    authorizeDevice,
    parseLoginMetadata,
    function (req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function (err, token) {
        if (err) return next(err);

        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, { path: req.getRoot() }),
          device: req.device,
          api: config.api
        });
      });

      req.session = null;
    }
  );

  app.post(
    strategyConfig.options.callbackPath,
    authenticate,
    function (req, res) {
      if (req.body.RelayState === MAGE_SAML_SP_INITIATION_STATE) {
        res.render('authentication', { host: req.getRoot(), success: true, login: { user: req.user } });
      } else {
        const url = req.user.active ? '/#/signin?strategy=saml&action=authorize-device' : '/#/signin?action=inactive-account';
        res.redirect(url);
      }
    }
  );

};