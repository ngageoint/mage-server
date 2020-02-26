module.exports = function(app, passport, provisioning, strategyConfig) {

  const log = require('winston')
    , LdapStrategy = require('passport-ldapauth')
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
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

  function isAuthenticated(req, res, next) {
    if (!req.user) {
      return res.sendStatus(401);
    }

    next();
  }

  function authorizeDevice(req, res, next) {
    provisioning.provision.check(provisioning.strategy, {uid: req.param('uid')}, function(err, device) {
      if (err) return next(err);

      if (provisioning.strategy === 'uid' && (!device || !device.registered)) {
        return res.sendStatus(403);
      } else {
        req.device = device;
        next();
      }
    })(req, res, next);
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
    console.log('Successful active directory login profile is', profile);

    const username = profile[strategyConfig.ldapUsernameField];
    User.getUserByAuthenticationId('ldap', username, function(err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function(err, role) {
          if (err) return done(err);

          var user = {
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
            return done(err, newUser);
          });
        });
      } else if (!user.active) {
        return done(null, user, { message: 'User account is not approved, please contact your MAGE administrator to approve your account.'});
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

        req.login(user, function(err) {
          if (err) return next(err);

          res.json({
            user: userTransformer.transform(req.user, {path: req.getRoot()})
          });
        });
      })(req, res, next);
    }
  );

  function authorizeUser(req, res, next) {
    let token = req.param('access_token');

    if (req.user) {
      next();
    } else if (token) {
      log.warn('DEPRECATED - authorization with access_token has been deprecated, please use a session');
      next(new Error("Not supported"));
    } else {
      return res.sendStatus(403);
    }
  }
 
  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/ldap/devices',
    authorizeUser,
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
            .then(device => res.json(device))
            .catch(err => next(err));
        })
        .catch(err => next(err));
    }
  );

  app.post(
    '/auth/ldap/authorize',
    isAuthenticated,
    authorizeDevice,
    parseLoginMetadata,
    function(req, res, next) {
      new api.User().login(req.user,  req.provisionedDevice, req.loginOptions, function(err, token) {
        if (err) return next(err);

        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()}),
          device: req.device,
          api: config.api
        });
      });

      req.session = null;
    }
  );
};
