'use strict';

import { InternalOAuthError, Strategy as OAuth2Strategy, StrategyOptions as OAuth2Options, VerifyFunction } from 'passport-oauth2'
import { TokenAssertion, JWTService } from './verification'
import base64 from 'base-64'
const api = require('../api')
const log = require('../logger')
const User = require('../models/user')
const Role = require('../models/role')
const { app, passport, tokenService } = require('./index');

interface MageOAuth2Options extends OAuth2Options {
  profileURL: string
}

class OAuth2ProfileStrategy extends OAuth2Strategy {

  private _profileURL: string

  constructor(options: MageOAuth2Options, verify: VerifyFunction) {
    super(options as OAuth2Options, verify)
    if (!options.profileURL) {
      throw new TypeError('OAuth2: missing profileURL')
    }
    this._profileURL = options.profileURL
    this._oauth2.useAuthorizationHeaderforGET(true)
  }

  userProfile(accessToken: string, done: (err: unknown, profile?: any) => void): void {
    this._oauth2.get(this._profileURL, accessToken, (err, body) => {
      if (err) {
        return done(new InternalOAuthError('error fetching oauth2 user profile', err))
      }
      try {
        const parsedBody = JSON.parse(body as string)
        const profile = {
          provider: 'oauth2',
          json: parsedBody,
          raw: body,
        }
        done(null, profile)
      }
      catch (err) {
        log.error('error parsing oauth profile', err)
        done(err)
      }
    })
  }
}

function configure(strategy) {
  log.info(`configuring ${strategy.title} oauth2 authentication`);
  const customHeaders = strategy.settings.headers?.basic ? {
    authorization: `Basic ${base64.encode(`${strategy.settings.clientID}:${strategy.settings.clientSecret}`)}`
  } : undefined
  passport.use(strategy.name, new OAuth2ProfileStrategy(
    {
      clientID: strategy.settings.clientID,
      clientSecret: strategy.settings.clientSecret,
      callbackURL: `/auth/${strategy.name}/callback`,
      authorizationURL: strategy.settings.authorizationURL,
      tokenURL: strategy.settings.tokenURL,
      profileURL: strategy.settings.profileURL,
      customHeaders: customHeaders,
      scope: strategy.settings.scope,
      pkce: strategy.settings.pkce,
      /**
       * cast to `any` because `@types/passport-oauth2` incorrectly does not allow `boolean` for the `store` entry
       * https://github.com/jaredhanson/passport-oauth2/blob/master/lib/strategy.js#L107
       */
      store: true as any
    },
    function (accessToken, refreshToken, profileResponse, done) {
      const profile = profileResponse.json;

      if (!profile[strategy.settings.profile.id]) {
        log.warn("JSON: " + JSON.stringify(profile) + " RAW: " + profileResponse.raw);
        return done(`OAuth2 user profile does not contain id property named ${strategy.settings.profile.id}`);
      }

      const profileId = profile[strategy.settings.profile.id];

      // TODO: users-next
      // TODO: should be by strategy name, not strategy type
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
            // TODO: users-next
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
        res.render('authentication', { host: req.getRoot(), success: true, login: { token: req.token, user: req.user } });
      }
    }
  );
};

module.exports = {
  initialize
}