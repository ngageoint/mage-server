const LdapStrategy = require('passport-ldapauth')
  , log = require('winston')
  , User = require('../models/user')
  , Role = require('../models/role')
  , Device = require('../models/device')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , userTransformer = require('../transformers/user')
  , AuthenticationInitializer = require('./index')
  , authenticationApiAppender = require('../utilities/authenticationApiAppender');

function doConfigure(strategyConfig) {
  log.info('Configuring ' + strategyConfig.title + ' authentication');

  const strategy = new LdapStrategy({
    server: {
      url: strategyConfig.settings.url,
      bindDN: strategyConfig.settings.bindDN,
      bindCredentials: strategyConfig.settings.bindCredentials,
      searchBase: strategyConfig.settings.searchBase,
      searchFilter: strategyConfig.settings.searchFilter
    }
  },
    function (profile, done) {
      const username = profile[strategyConfig.settings.ldapUsernameField];
      User.getUserByAuthenticationStrategy(strategyConfig.type, username, function (err, user) {
        if (err) return done(err);

        if (!user) {
          // Create an account for the user
          Role.getRole('USER_ROLE', function (err, role) {
            if (err) return done(err);

            const user = {
              username: username,
              displayName: profile[strategyConfig.settings.ldapDisplayNameField],
              email: profile[strategyConfig.settings.ldapEmailField],
              active: false,
              roleId: role._id,
              authentication: {
                type: strategyConfig.name,
                id: username,
                authenticationConfiguration: {
                  name: strategyConfig.name
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
    });
    
  AuthenticationInitializer.passport.use(strategyConfig.name, strategy);
}

function initialize(config) {
  const app = AuthenticationInitializer.app;
  const passport = AuthenticationInitializer.passport;
  const provision = AuthenticationInitializer.provision;
  const tokenService = AuthenticationInitializer.tokenService;

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  doConfigure(config);

  const authenticationOptions = {
    invalidLogonHours: `Not Permitted to login to ${config.title} account at this time.`,
    invalidWorkstation: `Not permited to logon to ${config.title} account at this workstation.`,
    passwordExpired: `${config.title} password expired.`,
    accountDisabled: `${config.title} account disabled.`,
    accountExpired: `${config.title} account expired.`,
    passwordMustChange: `User must reset ${config.title} password.`,
    accountLockedOut: `${config.title} user account locked.`,
    invalidCredentials: `Invalid ${config.title} username/password.`
  };

  app.post(
    '/auth/' + config.name + '/signin',
    function authenticate(req, res, next) {
      passport.authenticate(config.name, authenticationOptions, function (err, user, info = {}) {
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

        // DEPRECATED session authorization, remove req.login which creates session in next version
        req.login(user, function (err) {
          if (err) return next(err);

          tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
            .then(token => {
              res.json({
                user: userTransformer.transform(req.user, { path: req.getRoot() }),
                token: token
              });
            }).catch(err => {
              next(err);
            });
        });
      })(req, res, next);
    }
  );

  // DEPRECATED, this will be removed in next major server version release
  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/' + config.name + '/devices',
    function (req, res, next) {
      // check user session
      if (req.user) {
        next();
      } else {
        return res.sendStatus(403);
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
    '/auth/' + config.name + '/authorize',
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
    provision.check(config.name),
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