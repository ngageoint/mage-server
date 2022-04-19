'use strict';

const OAuth2Strategy = require('passport-oauth2').Strategy
   , TokenAssertion = require('./verification').TokenAssertion
   , base64 = require('base-64')
   , api = require('../api')
   , log = require('../logger')
   , User = require('../models/user')
   , Role = require('../models/role')
   , { app, passport, tokenService } = require('./index');

class OAuth2ProfileStrategy extends OAuth2Strategy {
   constructor(options, verify) {
      super(options, verify);

      if (!options.profileURL) { throw new TypeError('OAuth2Strategy requires a profileURL option'); }
      this._profileURL = options.profileURL;

      this._oauth2.useAuthorizationHeaderforGET(true);
   }

   userProfile(accessToken, done) {
      this._oauth2.get(this._profileURL, accessToken, function (err, body) {
         if (err) { return done(new InternalOAuthError('Failed to fetch user profile', err)); }

         try {
            const json = JSON.parse(body);

            const profile = {};
            profile.provider = 'oauth2';
            profile.raw = body;
            profile.json = json;

            done(null, profile);
         } catch (e) {
            log.warn('Error parsing oauth profile', e);
            done(e);
         }
      });
   }
}

function configure(strategy) {
   log.info('Configuring ' + strategy.title + ' authentication');

   let customHeaders = null;

   if (strategy.settings.headers) {
      customHeaders = {};
      if (strategy.settings.headers.basic) {
         customHeaders['Authorization'] = `Basic ${base64.encode(`${strategy.settings.clientID}:${strategy.settings.clientSecret}`)}`;
      }
   }

   passport.use(strategy.name, new OAuth2ProfileStrategy({
      clientID: strategy.settings.clientID,
      clientSecret: strategy.settings.clientSecret,
      callbackURL: `/auth/${strategy.name}/callback`,
      authorizationURL: strategy.settings.authorizationURL,
      tokenURL: strategy.settings.tokenURL,
      profileURL: strategy.settings.profileURL,
      customHeaders: customHeaders,
      scope: strategy.settings.scope,
      pkce: strategy.settings.pkce,
      store: true
   }, function (accessToken, refreshToken, profileResponse, done) {
      const profile = profileResponse.json;

      if (!profile[strategy.settings.profile.id]) {
         log.warn("JSON: " + JSON.stringify(profile) + " RAW: " + profileResponse.raw);
         return done(`OAuth2 user profile does not contain id property named ${strategy.settings.profile.id}`);
      }

      const profileId = profile[strategy.settings.profile.id];

      User.getUserByAuthenticationStrategy(strategy.type, profileId, function (err, user) {
         if (err) return done(err);

         if (!user) {
            // Create an account for the user
            Role.getRole('USER_ROLE', function (err, role) {
               if (err) return done(err);

               let email = null;
               if (profile[strategy.settings.profile.email]) {
                  if (Array.isArray(profile[strategy.settings.profile.email])) {
                     email = profile[strategy.settings.profile.email].find(email => {
                        email.verified === true
                     });
                  } else {
                     email = profile[strategy.settings.profile.email];
                  }
               } else {
                  log.warn(`OAuth2 user profile does not contain email property named ${strategy.settings.profile.email}`);
                  log.debug(JSON.stringify(profile));
               }

               const user = {
                  username: profileId,
                  displayName: profile[strategy.settings.profile.displayName] || profileId,
                  email: email,
                  active: false,
                  roleId: role._id,
                  authentication: {
                     type: strategy.type,
                     id: profileId,
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
}

function setDefaults(strategy) {
   if (!strategy.settings.profile) {
      strategy.settings.profile = {};
   }
   if (!strategy.settings.profile.displayName) {
      strategy.settings.profile.displayName = 'displayName';
   }
   if (!strategy.settings.profile.email) {
      strategy.settings.profile.email = 'email';
   }
   if (!strategy.settings.profile.id) {
      strategy.settings.profile.id = 'id';
   }
}

function initialize(strategy) {
   setDefaults(strategy);

   // TODO lets test with newer geoaxis server to see if this is still needed
   // If it is, this should be a admin client side option, would also need to modify the
   // renderer to provide a more generic message
   strategy.redirect = false;
   configure(strategy);

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
               req.info = info;
               next();
            }).catch(err => next(err));
      })(req, res, next);
   }

   app.get(`/auth/${strategy.name}/signin`,
      function (req, res, next) {
         passport.authenticate(strategy.name, {
            scope: strategy.settings.scope,
            state: req.query.state
         })(req, res, next);
      }
   );

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
               res.render('oauth', { uri: uri });
            }
         } else {
            res.render('authentication', { host: req.getRoot(), login: { token: req.token, user: req.user } });
         }
      }
   );
};

module.exports = {
   initialize
}