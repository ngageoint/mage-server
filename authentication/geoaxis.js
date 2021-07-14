const GeoaxisStrategy = require('passport-geoaxis-oauth20').Strategy
  , User = require('../models/user')
  , Device = require('../models/device')
  , Role = require('../models/role')
  , api = require('../api')
  , log = require('../logger')
  , AuthenticationInitializer = require('./index')
  , SecurePropertyAppender = require('../security/utilities/secure-property-appender')
  , OAuth = require('./oauth');

function doConfigure(strategyConfig) {
  log.info('Configuring ' + strategyConfig.title + ' authentication');
  const strategy = new GeoaxisStrategy({
    clientID: strategyConfig.settings.clientID,
    clientSecret: strategyConfig.settings.clientSecret,
    callbackURL: strategyConfig.settings.callbackUrl,
    authorizationURL: strategyConfig.settings.authorizationUrl + '/ms_oauth/oauth2/endpoints/oauthservice/authorize',
    tokenURL: strategyConfig.settings.apiUrl + '/ms_oauth/oauth2/endpoints/oauthservice/tokens',
    userProfileURL: strategyConfig.settings.apiUrl + '/ms_oauth/resources/userprofile/me'
  },
    function (accessToken, refreshToken, profile, done) {
      const geoaxisUser = profile._json;
      User.getUserByAuthenticationStrategy(strategyConfig.type, geoaxisUser.email, function (err, user) {
        if (err) return done(err);

        if (!user) {
          // Create an account for the user
          Role.getRole('USER_ROLE', function (err, role) {
            if (err) return done(err);

            const email = geoaxisUser.email;

            const user = {
              username: email,
              displayName: email.split("@")[0],
              email: email,
              active: false,
              roleId: role._id,
              authentication: {
                type: strategyConfig.name,
                id: email,
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
          log.warn('Failed user login attempt: User ' + user.username + ' account is not active.');
          return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account." });
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
  OAuth.initialize(config);

  SecurePropertyAppender.appendToConfig(config).then(appendedConfig => {
    doConfigure(appendedConfig);
  }).catch(err => {
    log.error(err);
  });

  const app = AuthenticationInitializer.app;

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
};

module.exports = {
  initialize
}