const SamlStrategy = require('passport-saml').Strategy
  , log = require('winston')
  , User = require('../models/user')
  , Role = require('../models/role')
  , Device = require('../models/device')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , config = require('../config.js')
  , userTransformer = require('../transformers/user')
  , AuthenticationConfiguration = require('../models/authenticationconfiguration')
  , authenticationApiAppender = require('../utilities/authenticationApiAppender');

function configure(passport) {
  AuthenticationConfiguration.getConfiguration('saml', 'saml').then(strategyConfig => {

    if (strategyConfig && strategyConfig.enabled) {
      passport.use(new SamlStrategy(strategyConfig.settings.options, function (profile, done) {
        const uid = profile[strategyConfig.settings.uidAttribute];
        User.getUserByAuthenticationStrategy('saml', uid, function (err, user) {
          if (err) return done(err);

          if (!user) {
            // Create an account for the user
            Role.getRole('USER_ROLE', function (err, role) {
              if (err) return done(err);

              const user = {
                username: uid,
                displayName: profile[strategyConfig.settings.displayNameAttribute],
                email: profile[strategyConfig.settings.emailAttribute],
                active: false,
                roleId: role._id,
                authentication: {
                  type: 'saml',
                  id: uid
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

      app.post(
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
              res.redirect(`/#/signin?strategy=saml&action=authorize-device&token=${req.token}`);
            } else {
              const action = !req.user.active ? 'inactive-account' : 'disabled-account';
              res.redirect(`/#/signin?strategy=saml&action=${action}`);
            }
          }
        }
      );
    } else {
      log.info('saml strategy is not configured or enabled');
    }
  }).catch(err => {
    log.error(err);
  });
}

function init(app, passport, provision, tokenService) {

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  configure(passport);

  app.get(
    '/auth/saml/signin',
    function (req, res, next) {
      const state = {
        initiator: 'mage',
        client: req.query.state
      };

      passport.authenticate('saml', {
        additionalParams: { RelayState: JSON.stringify(state) }
      })(req, res, next);
    }
  );


  function authenticate(req, res, next) {
    passport.authenticate('saml', function (err, user, info = {}) {
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
            req.info = info
            next();
          }).catch(err => {
            next(err);
          });
      });
    })(req, res, next);
  }

  // DEPRECATED retain old routes as deprecated until next major version.
  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/saml/devices',
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
    '/auth/saml/authorize',
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
    provision.check('saml'),
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
  init,
  configure
}