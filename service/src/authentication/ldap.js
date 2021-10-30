const LdapStrategy = require('passport-ldapauth')
  , log = require('winston')
  , User = require('../models/user')
  , Role = require('../models/role')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , userTransformer = require('../transformers/user')
  , { app, passport, tokenService } = require('./index');

function configure(strategy) {
  log.info('Configuring ' + strategy.title + ' authentication');

  passport.use(strategy.name, new LdapStrategy({
    server: {
      url: strategy.settings.url,
      bindDN: strategy.settings.bindDN,
      bindCredentials: strategy.settings.bindCredentials,
      searchBase: strategy.settings.searchBase,
      searchFilter: strategy.settings.searchFilter,
      searchScope: strategy.settings.searchScope,
      groupSearchBase: strategy.settings.groupSearchBase,
      groupSearchFilter: strategy.settings.groupSearchFilter,
      groupSearchScope: strategy.settings.groupSearchScope,
      bindProperty: strategy.settings.bindProperty,
      groupDnProperty: strategy.settings.groupDnProperty
    }
  },
    function (profile, done) {
      const username = profile[strategy.settings.profile.id ];
      User.getUserByAuthenticationStrategy(strategy.type, username, function (err, user) {
        if (err) return done(err);

        if (!user) {
          // Create an account for the user
          Role.getRole('USER_ROLE', function (err, role) {
            if (err) return done(err);

            const user = {
              username: username,
              displayName: profile[strategy.settings.profile.displayName],
              email: profile[strategy.settings.profile.email],
              active: false,
              roleId: role._id,
              authentication: {
                type: strategy.name,
                id: username,
                authenticationConfiguration: {
                  name: strategy.name
                }
              }
            };

            new api.User().create(user).then(newUser => {
              if (!newUser.authentication.authenticationConfiguration.enabled) {
                log.warn(newUser.authentication.authenticationConfiguration.title + " authentication is not enabled");
                return done(null, newUser, { message: 'Authentication method is not enabled, please contact a MAGE administrator for assistance.' });
              }
              if (newUser.active) {
                done(null, newUser);
              } else {
                done(null, newUser, { status: 403 });
              }
            }).catch(err => done(err));
          });
        } else if (!user.authentication.authenticationConfiguration.enabled) {
          log.warn(user.authentication.authenticationConfiguration.title + " authentication is not enabled");
          return done(null, user, { message: 'Authentication method is not enabled, please contact a MAGE administrator for assistance.' });
        } else {
          return done(null, user);
        }
      });
    })
  );
}

function setDefaults(strategy) {
  if (!strategy.settings.profile) {
     strategy.settings.profile = {};
  }
  if (!strategy.settings.profile.displayName) {
     strategy.settings.profile.displayName = 'givenname';
  }
  if (!strategy.settings.profile.email) {
     strategy.settings.profile.email = 'mail';
  }
  if (!strategy.settings.profile.id) {
     strategy.settings.profile.id = 'cn';
  }
}

function initialize(strategy) {
  setDefaults(strategy);
  configure(strategy);

  const authenticationOptions = {
    invalidLogonHours: `Not Permitted to login to ${strategy.title} account at this time.`,
    invalidWorkstation: `Not permited to logon to ${strategy.title} account at this workstation.`,
    passwordExpired: `${strategy.title} password expired.`,
    accountDisabled: `${strategy.title} account disabled.`,
    accountExpired: `${strategy.title} account expired.`,
    passwordMustChange: `User must reset ${strategy.title} password.`,
    accountLockedOut: `${strategy.title} user account locked.`,
    invalidCredentials: `Invalid ${strategy.title} username/password.`
  };

  app.post(`/auth/${strategy.name}/signin`,
    function authenticate(req, res, next) {
      passport.authenticate(strategy.name, authenticationOptions, function (err, user, info = {}) {
        if (err) return next(err);

        if (!user) {
          return res.status(401).send(info.message);
        }

        if (!user.active) {
          return res.status(info.status || 401).send('User account is not approved, please contact your MAGE administrator to approve your account.');
        }

        if (!user.enabled) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is disabled.');
          return res.status(401).send('Your account has been disabled, please contact a MAGE administrator for assistance.')
        }

        if (!user.authentication.authenticationConfigurationId) {
          log.warn('Failed user login attempt: ' + user.authentication.type + ' is not configured');
          return res.status(401).send(user.authentication.type + ' authentication is not configured, please contact a MAGE administrator for assistance.')
        }

        if (!user.authentication.authenticationConfiguration.enabled) {
          log.warn('Failed user login attempt: Authentication ' + user.authentication.authenticationConfiguration.title + ' is disabled.');
          return res.status(401).send(user.authentication.authenticationConfiguration.title + ' authentication is disabled, please contact a MAGE administrator for assistance.')
        }

        tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
          .then(token => {
            res.json({
              user: userTransformer.transform(req.user, { path: req.getRoot() }),
              token: token
            });
          }).catch(err => next(err));
      })(req, res, next);
    }
  );
};

module.exports = {
  initialize
}