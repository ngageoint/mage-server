const GoogleStrategy = require('passport-google-oauth20').Strategy
  , User = require('../models/user')
  , Role = require('../models/role')
  , api = require('../api')
  , log = require('../logger')
  , AuthenticationInitializer = require('./index')
  , SecurePropertyAppender = require('../security/utilities/secure-property-appender')
  , OAuth = require('./oauth'); 

function doConfigure(strategyConfig) {
  log.info('Configuring ' + strategyConfig.title + ' authentication');
  const strategy = new GoogleStrategy({
    clientID: strategyConfig.settings.clientID,
    clientSecret: strategyConfig.settings.clientSecret,
    callbackURL: strategyConfig.settings.callbackURL
  },
    function (accessToken, refreshToken, profile, done) {
      User.getUserByAuthenticationStrategy(strategyConfig.type, profile.id, function (err, user) {
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
                type: strategyConfig.name,
                id: profile.id,
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
};

module.exports = {
  initialize
}