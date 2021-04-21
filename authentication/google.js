const GoogleStrategy = require('passport-google-oauth20').Strategy
  , User = require('../models/user')
  , Role = require('../models/role')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , config = require('../config.js')
  , log = require('../logger')
  , userTransformer = require('../transformers/user')
  , AuthenticationConfiguration = require('../models/authenticationconfiguration')
  , authenticationApiAppender = require('../utilities/authenticationApiAppender');

function configure(passport) {
  AuthenticationConfiguration.getConfiguration('oauth', 'google').then(googleStrategy => {

    if (googleStrategy && googleStrategy.enabled) {
      log.info('Configuring Google authentication');
      passport.use('google', new GoogleStrategy({
        clientID: googleStrategy.settings.clientID,
        clientSecret: googleStrategy.settings.clientSecret,
        callbackURL: googleStrategy.settings.callbackURL
      },
        function (accessToken, refreshToken, profile, done) {
          User.getUserByAuthenticationStrategy('google', profile.id, function (err, user) {
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

                new api.User().create(user).then(newUser => {
                  return done(null, newUser);
                }).catch(err => done(err));
              });
            } else if (!user.active) {
              return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account." });
            } else {
              return done(null, user);
            }
          });
        }));
    } else {
      log.info('google strategy is not configured or enabled');
    }
  }).catch(err => {
    log.error(err);
  });
}

function init(app, passport, provision, tokenService) {

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

  configure(passport);

  app.get(
    '/auth/google/signin',
    function (req, res, next) {
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

        authenticationApiAppender.append(config.api).then(api => {
          res.json({
            token: token.token,
            expirationDate: token.expirationDate,
            user: userTransformer.transform(req.user, { path: req.getRoot() }),
            device: req.provisionedDevice,
            api: api  // TODO scrub api
          });
        }).catch(err => {
          next(err);
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

module.exports = {
  init,
  configure
}