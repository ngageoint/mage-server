module.exports = function(app, passport, provisioning) {

  var log = require('winston')
    , moment = require('moment')
    , LocalStrategy = require('passport-local').Strategy
    , User = require('../models/user')
    , Device = require('../models/device')
    , api = require('../api')
    , config = require('../config.js')
    , userTransformer = require('../transformers/user');

  function parseLoginMetadata(req, res, next) {

    var options = {};
    options.userAgent = req.headers['user-agent'];
    options.appVersion = req.param('appVersion');

    req.loginOptions = options;
    next();
  }

  function authenticate(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      if (err) return next(err);

      info = info || {};
      if (!user) {
        return res.status(401).send(info.message);
      }

      req.user = user;
      next();
    })(req, res, next);
  }

  passport.use(new LocalStrategy(
    function(username, password, done) {
      User.getUserByUsername(username, function(err, user) {
        if (err) { return done(err); }

        if (!user) {
          log.warn('Failed login attempt: User with username ' + username + ' not found');
          return done(null, false);
        }

        if (!user.active) {
          log.warn('Failed user login attempt: User ' + user.username + ' is not active');
          return done(null, false);
        }

        if (!user.enabled) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is disabled.');
          return done(null, false, { message: 'Your account has been disabled, please contact a MAGE administrator for assistance.' });
        }

        let security = user.authentication.security;
        if (security.locked && moment().isBefore(moment(security.lockedUntil))) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is locked until ' + security.lockedUntil);
          return done(null, false, { message: 'Your account has been temporarily locked, please try again later or contact a MAGE administrator for assistance.' });
        }

        user.validPassword(password, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (isValid) {
            User.validLogin(user)
              .then(() => done(null, user))
              .catch(err => done(err));
          } else {
            log.warn('Failed login attempt: User with username ' + username + ' provided an invalid password');
            User.invalidLogin(user)
              .then(() => done(null, false, {message: 'Please check your username and password and try again.'}))
              .catch(err => done(err));
          }
        });
      });
    }
  ));


  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/api/devices',
    function authenticate(req, res, next) {
      passport.authenticate('local', function(err, user) {
        if (err) return next(err);
        if (user) {
          req.user = user;
          next();
        } else {
          // skip to next route
          return next('route');
        }
      })(req, res, next);
    },
    function(req, res, next) {
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
            .then(newDevice => res.json(newDevice))
            .catch(err => next(err));
        })
        .catch(err => next(err));
    }
  );

  app.post(
    '/api/login',
    authenticate,
    provisioning.provision.check(provisioning.strategy),
    parseLoginMetadata,
    function(req, res) {
      new api.User().login(req.user,  req.provisionedDevice, req.loginOptions, function(err, token) {
        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()}),
          api: config.api
        });
      });
    }
  );
};
