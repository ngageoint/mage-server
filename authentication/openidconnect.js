const OpenIdConnectStrategy = require('passport-openidconnect').Strategy
  , log = require('winston')
  , User = require('../models/user')
  , Role = require('../models/role')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , { app, passport, tokenService } = require('./index');

function configure(strategy) {
  log.info(`Configuring ${strategy.title} authentication`);

  passport.use(strategy.name, new OpenIdConnectStrategy({
    clientID: strategy.settings.clientID,
    clientSecret: strategy.settings.clientSecret,
    issuer: strategy.settings.issuer,
    authorizationURL: strategy.settings.authorizationURL,
    tokenURL: strategy.settings.tokenURL,
    userInfoURL: strategy.settings.userInfoURL,
    callbackURL: `/auth/${strategy.name}/callback`
  }, function (issuer, sub, profile, done) {
    User.getUserByAuthenticationStrategy(strategy.type, profile.id, function (err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function (err, role) {
          if (err) return done(err);

          const user = {
            username: profile.id,
            displayName: profile.displayName,
            email: profile.email,
            active: false,
            roleId: role._id,
            authentication: {
              type: strategy.name,
              id: profile.id,
              authenticationConfiguration: {
                name: strategy.name
              }
            }
          };

          new api.User().create(user).then(newUser => {
            if (!newUser.authentication.authenticationConfiguration.enabled) {
              log.warn(newUser.authentication.authenticationConfiguration.title + " authentication is not enabled");
              return done(null, false, { message: 'Authentication method is not enabled, please contact a MAGE administrator for assistance.' });
            }
            return done(null, newUser);
          }).catch(err => done(err));
        });
      } else if (!user.active) {
        return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account." });
      } else if (!user.authentication.authenticationConfiguration.enabled) {
        log.warn(user.authentication.authenticationConfiguration.title + " authentication is not enabled");
        return done(null, user, { message: 'Authentication method is not enabled, please contact a MAGE administrator for assistance.' });
      } else {
        return done(null, user);
      }
    });
  }));

  function authenticate(req, res, next) {
    passport.authenticate(strategy.name, function (err, user, info = {}) {
      if (err) return next(err);

      req.user = user;

      // For inactive or disabled accounts don't generate an authorization token
      if (!user.active || !user.enabled) {
        log.warn('Failed user login attempt: User ' + user.username + ' account is inactive or disabled.');
        return next();
      }

      if (!user.authentication.authenticationConfigurationId) {
        log.warn('Failed user login attempt: ' + user.authentication.type + ' is not configured');
        return next();
      }

      if (!user.authentication.authenticationConfiguration.enabled) {
        log.warn('Failed user login attempt: Authentication ' + user.authentication.authenticationConfiguration.title + ' is disabled.');
        return next();
      }

      tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
        .then(token => {
          req.token = token;
          req.user = user;
          req.info = info
          next();
        }).catch(err => {
          next(err);
        });
    })(req, res, next);
  }

  app.get(`/auth/${strategy.name}/callback`,
    authenticate,
    function (req, res) {
      if (req.query.state === 'mobile') {
        let uri;
        if (!req.user.active || !req.user.enabled) {
          uri = `mage://app/invalid_account?active=${req.user.active}&enabled=${req.user.enabled}`;
        } else {
          uri = `mage://app/authentication?token=${req.token}`
        }

        if (strategy.redirect) {
          res.redirect(uri);
        } else {
          res.render(strategy.name, { uri: uri });
        }
      } else {
        res.render('authentication', { host: req.getRoot(), login: { token: req.token, user: req.user } });
      }
    }
  );
}

function setDefaults(strategy) {
  //openid must be included in scope
  if (!strategy.settings.scope) {
    strategy.settings.scope = ['openid'];
  } else {
    if (!strategy.settings.scope.includes('openid')) {
      strategy.settings.scope.push('openid');
    }
  }
}

function initialize(strategy) {
  configure(strategy);
  setDefaults(strategy);

  app.get(`/auth/${strategy.name}/signin`,
    function (req, res, next) {
      passport.authenticate(strategy.name, {
        scope: ['openid', 'profile', 'email'],
        state: req.query.state
      })(req, res, next);
    }
  );
};

module.exports = {
  initialize
}