module.exports = function (app, passport, provisioning, googleStrategy) {

  var GoogleStrategy = require('passport-google-oauth20').Strategy
    , User = require('../models/user')
    , Role = require('../models/role')
    , api = require('../api')
    , config = require('../config.js')
    , userTransformer = require('../transformers/user');

  console.log('configuring google authentication');

  function parseLoginMetadata(req, res, next) {

    var options = {};
    options.userAgent = req.headers['user-agent'];
    options.appVersion = req.param('appVersion');

    req.loginOptions = options;
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

  function authenticate(req, res, next) {
    passport.authenticate('google', function (err, user, info = {}) {
      if (err) return next(err);

      req.info = info;

      req.login(user, next);
    })(req, res, next);
  }

  passport.use('google', new GoogleStrategy({
    passReqToCallback: true,
    clientID: googleStrategy.clientID,
    clientSecret: googleStrategy.clientSecret,
    callbackURL: googleStrategy.callbackURL
  },
  function (req, accessToken, refreshToken, profile, done) {
    req.googleToken = accessToken;

    User.getUserByAuthenticationId('google', profile.id, function (err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function (err, role) {
          if (err) return done(err);

          var email = null;
          profile.emails.forEach(function (e) {
            if (e.verified) {
              email = e.value;
            }
          });

          var user = {
            username: email,
            displayName: profile.name.givenName + ' ' + profile.name.familyName,
            email: email,
            active: false,
            roleId: role._id,
            authentication: {
              type: 'google',
              id: profile.id
            }
          };

          User.createUser(user, function (err, newUser) {
            return done(err, newUser);
          });
        });
      } else if (!user.active) {
        return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account." });
      } else {
        return done(null, user, { access_token: accessToken });
      }
    });
  }));

  app.get('/auth/google/signin', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.post(
    '/auth/google/authorize',
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

  app.get(
    '/auth/google/callback',
    authenticate,
    function (req, res, next) {
      res.render('authentication', { host: req.getRoot(), success: true, login: { user: req.user } });
    }
  );

};