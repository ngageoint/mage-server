const GoogleStrategy = require('passport-google-oauth20').Strategy
  , User = require('../models/user')
  , Role = require('../models/role')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , config = require('../config.js')
  , log = require('../logger')
  , userTransformer = require('../transformers/user');

module.exports = function (app, passport, provision, googleStrategy, tokenService) {
  log.info('Configuring Google authentication');

  function parseLoginMetadata(req, res, next) {
    const options = {};
    options.userAgent = req.headers['user-agent'];
    options.appVersion = req.param('appVersion');

    req.loginOptions = options;
    next();
  }

  function authenticate(req, res, next) {
    passport.authenticate('google', function (err, user) {
      if (err) return next(err);

      req.user = user;

      // For inactive or disabled accounts don't generate an authorization token
      if (!user.active || !user.enabled) {
        log.warn('Failed user login attempt: User ' + user.username + ' account is inactive or disabled.');
        return next();
      }

      // DEPRECATED session authorization, remove req.login which creates session in next version
      req.login(user, function (err) {
        tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
          .then(token => {
            req.token = token;
            req.user = user;
            next();
          }).catch(err => {
            next(err);
          });
      });
    })(req, res, next);
  }

  passport.use('google', new GoogleStrategy({
    clientID: googleStrategy.clientID,
    clientSecret: googleStrategy.clientSecret,
    callbackURL: googleStrategy.callbackURL
  },
  function (accessToken, refreshToken, profile, done) {
    User.getUserByAuthenticationId('google', profile.id, function (err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function (err, role) {
          if (err) return done(err);

          let email = null;
          profile.emails.forEach(function (e) {
            if (e.verified) {
              email = e.value;
            }
          });

          const user = {
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
        return done(null, user);
      }
    });
  }));

  app.get(
    '/auth/google/signin', 
    function(req, res, next) {
      passport.authenticate('google', { 
        scope: ['profile', 'email', 'openid'],
        state: req.query.state
      })(req, res, next);
    }
  );
    
  // DEPRECATED session authorization, remove in next version.
  app.post(
    '/auth/google/authorize',
    function (req, res, next) {
      if (req.user) {
        log.warn('session authorization is deprecated, please use jwt');
        return next();
      }

      passport.authenticate('authorization', function (err, user, info = {}) {
        if (!user) return res.status(401).send(info.message);

        req.user = user;
        next();
      })(req, res, next);
    },
    provision.check('google'),
    parseLoginMetadata,
    function (req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function (err, token) {
        if (err) return next(err);

        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, { path: req.getRoot() }),
          device: req.provisionedDevice,
          api: config.api  // TODO scrub api
        });
      });

      req.session = null;
    }
  );

  app.get(
    '/auth/google/callback',
    authenticate,
    function (req, res) {    
      if (req.query.state === 'mobile') {
        let uri;
        if (!req.user.active || !req.user.enabled) {
          uri = `mage://app/invalid_account?active=${req.user.active}&enabled=${req.user.enabled}`;
        } else {
          uri = `mage://app/authentication?token=${req.token}`
        }

        res.redirect(uri);
      } else {
        res.render('authentication', { host: req.getRoot(), login: { token: req.token, user: req.user } });
      }
    }
  );

};