const SamlStrategy = require('passport-saml').Strategy
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
  AuthenticationInitializer.passport.use(new SamlStrategy(strategyConfig.settings.options, function (profile, done) {
    const uid = profile['uid'];

    if (!uid) {
      log.warn('Failed to find property uid. SAML profile keys ' + Object.keys(profile));
      return done('Failed to load user id from SAML profile');
    }

    User.getUserByAuthenticationStrategy(strategyConfig.type, uid, function (err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function (err, role) {
          if (err) return done(err);

          const user = {
            username: uid,
            displayName: profile['email'],
            email: profile['email'],
            active: false,
            roleId: role._id,
            authentication: {
              type: strategyConfig.name,
              id: uid,
              authenticationConfiguration: {
                name: strategyConfig.name
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
    AuthenticationInitializer.passport.authenticate(strategyConfig.name, function (err, user, info = {}) {
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

      // DEPRECATED session authorization, remove req.login which creates session in next version
      req.login(user, function (err) {
        AuthenticationInitializer.tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
          .then(token => {
            req.token = token;
            req.user = user;
            req.info = info
            next();
          }).catch(err => {
            next(err);
          });
      });
    })(req, res, next);
  }

  AuthenticationInitializer.app.post(
    strategyConfig.settings.options.callbackPath,
    authenticate,
    function (req, res) {
      const state = JSON.parse(req.body.RelayState) || {};

      if (state.initiator === 'mage') {
        if (state.client === 'mobile') {
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
      } else {
        if (req.user.active && req.user.enabled) {
          res.redirect(`/#/signin?strategy=${config.name}&action=authorize-device&token=${req.token}`);
        } else {
          const action = !req.user.active ? 'inactive-account' : 'disabled-account';
          res.redirect(`/#/signin?strategy=${config.name}&action=${action}`);
        }
      }
    }
  );
}

function initialize(config) {
  const app = AuthenticationInitializer.app;
  const passport = AuthenticationInitializer.passport;
  const provision = AuthenticationInitializer.provision;

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  config.settings.options.callbackPath = '/auth/saml/callback';
  doConfigure(config);

  app.get(
    '/auth/' + config.name + '/signin',
    function (req, res, next) {
      const state = {
        initiator: 'mage',
        client: req.query.state
      };

      passport.authenticate(config.name, {
        additionalParams: { RelayState: JSON.stringify(state) }
      })(req, res, next);
    }
  );

  // DEPRECATED retain old routes as deprecated until next major version.
  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/' + config.name + '/devices',
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