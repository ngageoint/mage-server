const log = require('winston')
  , moment = require('moment')
  , LocalStrategy = require('passport-local').Strategy
  , TokenAssertion = require('./verification').TokenAssertion
  , User = require('../models/user')
  , Device = require('../models/device')
  , api = require('../api')
  , config = require('../config.js')
  , userTransformer = require('../transformers/user')
  , AuthenticationInitializer = require('./index')
  , AuthenticationApiAppender = require('../utilities/authenticationApiAppender')
  , Authentication = require('../models/authentication');

function configure() {
  log.info('Configuring local authentication');
  AuthenticationInitializer.passport.use(new LocalStrategy(
    function (username, password, done) {
      User.getUserByUsername(username, function (err, user) {
        if (err) { return done(err); }

        if (!user) {
          log.warn('Failed login attempt: User with username ' + username + ' not found');
          return done(null, false, { message: 'Please check your username and password and try again.' });
        }

        if (!user.active) {
          log.warn('Failed user login attempt: User ' + user.username + ' is not active');
          return done(null, false, { message: 'User account is not approved, please contact your MAGE administrator to approve your account.' });
        }

        if (!user.enabled) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is disabled.');
          return done(null, false, { message: 'Your account has been disabled, please contact a MAGE administrator for assistance.' });
        }

        const settings = user.authentication.security;
        if (settings && settings.locked && moment().isBefore(moment(settings.lockedUntil))) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is locked until ' + settings.lockedUntil);
          return done(null, false, { message: 'Your account has been temporarily locked, please try again later or contact a MAGE administrator for assistance.' });
        }

        if (!(user.authentication instanceof Authentication.Local)) {
          log.warn(user.username + " is not a local account");
          return done(null, false, { message: 'You do not have a local account, please contact a MAGE administrator for assistance.' });
        }

        if (!user.authentication.authenticationConfiguration.enabled) {
          log.warn(user.authentication.authenticationConfiguration.title + " authentication is not enabled");
          return done(null, false, { message: 'Authentication method is not enabled, please contact a MAGE administrator for assistance.' });
        }

        user.authentication.validatePassword(password, function (err, isValid) {
          if (err) return done(err);

          if (isValid) {
            User.validLogin(user)
              .then(() => done(null, user))
              .catch(err => done(err));
          } else {
            log.warn('Failed login attempt: User with username ' + username + ' provided an invalid password');
            User.invalidLogin(user)
              .then(() => done(null, false, { message: 'Please check your username and password and try again.' }))
              .catch(err => done(err));
          }
        });
      });
    }
  ));
}

function initialize() {
  const app = AuthenticationInitializer.app;
  const passport = AuthenticationInitializer.passport;
  const provision = AuthenticationInitializer.provision;
  const tokenService = AuthenticationInitializer.tokenService;

  function parseLoginMetadata(req, _res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  configure();

  // DEPRECATED retain old routes as deprecated until next major version.
  app.post(
    '/api/login',
    function authenticate(req, res, next) {
      log.warn('DEPRECATED - The /api/login route will be removed in the next major version, please use /auth/local/signin');

      passport.authenticate('local', function (err, user, info = {}) {
        if (err) return next(err);

        if (!user) return res.status(401).send(info.message);

        req.user = user;
        next();
      })(req, res, next);
    },
    provision.check(),
    parseLoginMetadata,
    function (req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function (err, token) {
        if (err) return next(err);

        AuthenticationApiAppender.append(config.api).then(api => {
          res.json({
            token: token.token,
            expirationDate: token.expirationDate,
            user: userTransformer.transform(req.user, { path: req.getRoot() }),
            api: api
          });
        }).catch(err => {
          next(err);
        });
      });
    }
  );

  app.post(
    '/auth/local/signin',
    function authenticate(req, res, next) {
      passport.authenticate('local', function (err, user, info = {}) {
        if (err) return next(err);

        if (!user) return res.status(401).send(info.message);

        // DEPRECATED session authorization, remove req.login which creates session in next version
        req.login(user, function (err) {
          if (err) return next(err);

          tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
            .then(token => {
              res.json({
                token: token,
                user: userTransformer.transform(user, { path: req.getRoot() })
              });
            }).catch(err => {
              next(err);
            });

        });
      })(req, res, next);
    }
  );

  // DEPRECATED retain old routes as deprecated until next major version.
  // Create a new device
  // Any authenticated user can create a new device, the registered field will be set to false.
  app.post('/auth/local/devices',
    function (req, res, next) {
      if (req.user) {
        next();
      } else {
        res.sendStatus(401);
      }
    },
    function (req, res, next) {
      const newDevice = {
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

  // DEPRECATED session authorization, remove in next version.
  app.post(
    '/auth/local/authorize',
    function (req, res, next) {
      if (req.user) {
        log.warn('session authorization is deprecated, please use jwt');
        return next();
      }

      passport.authenticate('authorization', function (err, user, info = {}) {
        if (err) return next(err);

        if (!user) return res.status(401).send(info.message);

        req.user = user;
        next();
      })(req, res, next);
    },
    provision.check('local', 'local'),
    parseLoginMetadata,
    function (req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function (err, token) {
        if (err) return next(err);

        AuthenticationApiAppender.append(config.api).then(api => {
          res.json({
            token: token.token,
            expirationDate: token.expirationDate,
            user: userTransformer.transform(req.user, { path: req.getRoot() }),
            device: req.provisionedDevice,
            api: api
          });
        }).catch(err => {
          next(err);
        });
      });

      req.session = null;
    }
  );
};

module.exports = {
  initialize
}