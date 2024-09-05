const SamlStrategy = require('@node-saml/passport-saml').Strategy
  , log = require('winston')
  , User = require('../models/user')
  , Role = require('../models/role')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , AuthenticationInitializer = require('./index')

function configure(strategy) {
  log.info('Configuring ' + strategy.title + ' authentication');

  const options = {
    path: `/auth/${strategy.name}/callback`,
    entryPoint: strategy.settings.entryPoint,
    cert: strategy.settings.cert,
    issuer: strategy.settings.issuer
  }
  if (strategy.settings.privateKey) {
    options.privateKey = strategy.settings.privateKey;
  }
  if (strategy.settings.decryptionPvk) {
    options.decryptionPvk = strategy.settings.decryptionPvk;
  }
  if (strategy.settings.signatureAlgorithm) {
    options.signatureAlgorithm = strategy.settings.signatureAlgorithm;
  }
  if(strategy.settings.audience) {
    options.audience = strategy.settings.audience;
  }
  if(strategy.settings.identifierFormat) {
    options.identifierFormat = strategy.settings.identifierFormat;
  }
  if(strategy.settings.acceptedClockSkewMs) {
    options.acceptedClockSkewMs = strategy.settings.acceptedClockSkewMs;
  }
  if(strategy.settings.attributeConsumingServiceIndex) {
    options.attributeConsumingServiceIndex = strategy.settings.attributeConsumingServiceIndex;
  }
  if(strategy.settings.disableRequestedAuthnContext) {
    options.disableRequestedAuthnContext = strategy.settings.disableRequestedAuthnContext;
  }
  if(strategy.settings.authnContext) {
    options.authnContext = strategy.settings.authnContext;
  }
  if(strategy.settings.forceAuthn) {
    options.forceAuthn = strategy.settings.forceAuthn;
  }
  if(strategy.settings.skipRequestCompression) {
    options.skipRequestCompression = strategy.settings.skipRequestCompression;
  }
  if(strategy.settings.authnRequestBinding) {
    options.authnRequestBinding = strategy.settings.authnRequestBinding;
  }
  if(strategy.settings.RACComparison) {
    options.RACComparison = strategy.settings.RACComparison;
  }
  if(strategy.settings.providerName) {
    options.providerName = strategy.settings.providerName;
  }
  if(strategy.settings.idpIssuer) {
    options.idpIssuer = strategy.settings.idpIssuer;
  }
  if(strategy.settings.validateInResponseTo) {
    options.validateInResponseTo = strategy.settings.validateInResponseTo;
  }
  if(strategy.settings.requestIdExpirationPeriodMs) {
    options.requestIdExpirationPeriodMs = strategy.settings.requestIdExpirationPeriodMs;
  }
  if(strategy.settings.logoutUrl) {
    options.logoutUrl = strategy.settings.logoutUrl;
  }

  AuthenticationInitializer.passport.use(new SamlStrategy(options, function (profile, done) {
    const uid = profile[strategy.settings.profile.id];

    if (!uid) {
      log.warn('Failed to find property uid. SAML profile keys ' + Object.keys(profile));
      return done('Failed to load user id from SAML profile');
    }

    // TODO: users-next
    User.getUserByAuthenticationStrategy(strategy.type, uid, function (err, user) {
      if (err) return done(err);

      if (!user) {
        // Create an account for the user
        Role.getRole('USER_ROLE', function (err, role) {
          if (err) return done(err);

          const user = {
            username: uid,
            displayName: profile[strategy.settings.profile.displayName],
            email: profile[strategy.settings.profile.email],
            active: false,
            roleId: role._id,
            authentication: {
              type: strategy.name,
              id: uid,
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

  function authenticate(req, res, next) {
    AuthenticationInitializer.passport.authenticate(strategy.name, function (err, user, info = {}) {
      if (err) {
        console.error('saml: authentication error', err);
        return next(err);
      }

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
        if (err) {
          return next(err);
        }
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
    `/auth/${strategy.name}/callback`,
    authenticate,
    function (req, res) {
      let state = {};
      try {
        state = JSON.parse(req.body.RelayState)
      } catch (ignore) {
        console.warn('saml: error parsing RelayState', ignore)
      }

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
          res.redirect(`/#/signin?strategy=${strategy.name}&action=authorize-device&token=${req.token}`);
        } else {
          const action = !req.user.active ? 'inactive-account' : 'disabled-account';
          res.redirect(`/#/signin?strategy=${strategy.name}&action=${action}`);
        }
      }
    }
  );
}

function setDefaults(strategy) {
  if (!strategy.settings.profile) {
    strategy.settings.profile = {};
  }
  if (!strategy.settings.profile.displayName) {
    strategy.settings.profile.displayName = 'email';
  }
  if (!strategy.settings.profile.email) {
    strategy.settings.profile.email = 'email';
  }
  if (!strategy.settings.profile.id) {
    strategy.settings.profile.id = 'uid';
  }
}

function initialize(strategy) {
  const app = AuthenticationInitializer.app;
  const passport = AuthenticationInitializer.passport;
  // const provision = AuthenticationInitializer.provision;

  setDefaults(strategy);
  configure(strategy);

  // function parseLoginMetadata(req, res, next) {
  //   req.loginOptions = {
  //     userAgent: req.headers['user-agent'],
  //     appVersion: req.param('appVersion')
  //   };

  //   next();
  // }
  app.get(
    '/auth/' + strategy.name + '/signin',
    function (req, res, next) {
      const state = {
        initiator: 'mage',
        client: req.query.state
      };

      passport.authenticate(strategy.name, {
        additionalParams: { RelayState: JSON.stringify(state) }
      })(req, res, next);
    }
  );
}

module.exports = {
  initialize
}