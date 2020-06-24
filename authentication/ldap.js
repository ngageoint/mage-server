module.exports = function(app, passport, provision, strategyConfig, tokenService) {

  const LdapStrategy = require('passport-ldapauth')
    , log = require('winston')
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , TokenAssertion = require('./verification').TokenAssertion
    , api = require('../api')
    , config = require('../config.js')
    , userTransformer = require('../transformers/user');

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }
  const authenticationOptions = {
    invalidLogonHours: `Not Permitted to login to ${strategyConfig.title} account at this time.`,
    invalidWorkstation: `Not permited to logon to ${strategyConfig.title} account at this workstation.`,
    passwordExpired: `${strategyConfig.title} password expired.`,
    accountDisabled: `${strategyConfig.title} account disabled.`,
    accountExpired: `${strategyConfig.title} account expired.`,
    passwordMustChange: `User must reset ${strategyConfig.title} password.`,
    accountLockedOut: `${strategyConfig.title} user account locked.`,
    invalidCredentials: `Invalid ${strategyConfig.title} username/password.`
  };

  passport.use(new LdapStrategy({
    server: {
      url: strategyConfig.url,
      bindDN: strategyConfig.bindDN,
      bindCredentials: strategyConfig.bindCredentials,
      searchBase: strategyConfig.searchBase,
      searchFilter: strategyConfig.searchFilter
    }
  },
  function(profile, done) {
    const username = profile[strategyConfig.ldapUsernameField];
    User.getUserByAuthenticationId('ldap', username, function(err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function(err, role) {
          if (err) return done(err);

          const user = {
            username: username,
            displayName: profile[strategyConfig.ldapDisplayNameField],
            email: profile[strategyConfig.ldapEmailField],
            active: false,
            roleId: role._id,
            authentication: {
              type: 'ldap',
              id: username
            }
          };

          User.createUser(user, function(err, newUser) {
            if (newUser.active) {
              done(err, newUser);
            } else {
              return done(null, newUser, { status: 403 });
            }
          });
        });
      } else {
        return done(null, user);
      }
    });
  }));

  app.post(
    '/auth/ldap/signin',
    function authenticate(req, res, next) {
      passport.authenticate('ldapauth', authenticationOptions, function(err, user, info = {}) {
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

        // DEPRECATED session authorization, remove req.login which creates session in next version
        req.login(user, function(err) {
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
  app.post('/auth/ldap/devices',
    function(req, res, next) {
      // check user session
      if (req.user) {
        next();
      } else {
        return res.sendStatus(403);
      }
    },
    function(req, res, next) {
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
    '/auth/ldap/authorize',
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
    provision.check('ldap'),
    parseLoginMetadata,
    function(req, res, next) {
      new api.User().login(req.user,  req.provisionedDevice, req.loginOptions, function(err, token) {
        if (err) return next(err);

        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()}),
          device: req.provisionedDevice,
          api: config.api
        });
      });

      req.session = null;
    }
  );
};
