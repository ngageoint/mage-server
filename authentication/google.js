'use strict';

const GoogleStrategy = require('passport-google-oauth20').Strategy
  , User = require('../models/user')
  , Role = require('../models/role')
  , api = require('../api')
  , log = require('../logger')
  , AuthenticationInitializer = require('./index')
  , OAuth = require('./oauth');

function doConfigure(config) {
  log.info('Configuring ' + config.title + ' authentication');
  const strategy = new GoogleStrategy({
    clientID: config.settings.clientID,
    clientSecret: config.settings.clientSecret,
    callbackURL: config.settings.callbackURL
  }, function (accessToken, refreshToken, profile, done) {
    User.getUserByAuthenticationStrategy(config.type, profile.id, function (err, user) {
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
              type: config.type,
              id: profile.id,
              authenticationConfiguration: {
                name: config.name
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

  AuthenticationInitializer.passport.use(config.name, strategy);
}

function initialize(config) {
  config.scope = ['profile', 'email', 'openid'];
  doConfigure(config);

  OAuth.initialize(config);
};

module.exports = {
  initialize
}