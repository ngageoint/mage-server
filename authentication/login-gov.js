module.exports = function(app, passport, provision) {

  const fs = require('fs')
    , crypto = require('crypto')
    , pem2jwk = require('pem-jwk').pem2jwk
    , jose = require('node-jose')
    , Issuer = require('openid-client').Issuer
    , Strategy = require('openid-client').Strategy
    , User = require('../models/user')
    , Device = require('../models/device')
    , Role = require('../models/role')
    , api = require('../api')
    , config = require('../config.js')
    , log = require('../logger');

  Issuer.useRequest();

  const strategyConfig = config.api.authenticationStrategies['login-gov'];
  log.info('Configuring login.gov authentication', strategyConfig);
  const loginGov = {};

  const key = fs.readFileSync(strategyConfig.keyFile, 'ascii');
  const jwk = pem2jwk(key);
  const keys = [jwk];

  function getParams() {
    return {
      response_type: 'code',
      acr_values: strategyConfig.acr_values,
      scope: 'openid email',
      redirect_uri: strategyConfig.redirect_uri,
      nonce: crypto.randomBytes(32).toString('hex'),
      state: crypto.randomBytes(32).toString('hex'),
      prompt: 'select_account',
    };
  }

  let client;
  Promise.all([
    jose.JWK.asKeyStore(keys),
    Issuer.discover(strategyConfig.url)
  ]).then(function([keystore, issuer]) {
    loginGov.issuer = issuer; // allow subsequent access to issuer.end_session_endpoint (required during RP-Initiated Logout)

    client = new issuer.Client({
      client_id: strategyConfig.client_id,
      token_endpoint_auth_method: 'private_key_jwt',
      id_token_signed_response_alg: 'RS256'
    }, keystore);

    client.CLOCK_TOLERANCE = 10;

    const params = getParams();
    passport.use('oidc-loa-1', new Strategy({client: client, params: params, passReqToCallback: true}, function(req, tokenset, userinfo, done) {
      userinfo.token = tokenset.id_token; // required for RP-Initiated Logout
      userinfo.state = params.state; // required for RP-Initiated Logout

      User.getUserByAuthenticationStrategy('login-gov', userinfo.email, function(err, user) {
        if (err) return done(err);

        const email = userinfo.email;

        if (!user) {
          // Create an account for the user
          Role.getRole('USER_ROLE', function(err, role) {
            if (err) return done(err);

            const user = {
              username: email,
              displayName: email.split("@")[0],
              email: email,
              active: false,
              roleId: role._id,
              authentication: {
                type: 'login-gov',
                id: email
              }
            };

            new api.User().create(user).then(newUser => {
              return done(null, newUser);
            }).catch(err => done(err));
          });
        } else if (!user.active) {
          return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account."} );
        } else {
          return done(null, user, {access_token: tokenset.access_token});
        }
      });
    }));

    log.info("login.gov configuration success");
  }).catch(function(err) {
    log.error('login.gov configuration error', err);
  });

  function parseLoginMetadata(req, res, next) {
    const options = {};
    options.userAgent = req.headers['user-agent'];
    options.appVersion = req.param('appVersion');

    req.loginOptions = options;
    next();
  }

  function authenticate(req, res, next) {
    passport.authenticate('oidc-loa-1', function(err, user, info) {
      if (err) return next(err);
      req.info = info || {};

      req.login(user, next);
    })(req, res, next);
  }

  function authorizeUser(req, res, next) {
    const token = req.param('access_token');

    if (req.user) {
      // We have a session, user has already authenticated
      return next();
    } else if (token) {
      log.warn('DEPRECATED - authorization with access_token has been deprecated, please use a session');

      client.userinfo(token)
        .then(function(userinfo) {
          log.debug('Got userinfo from login.gov');
          User.getUserByAuthenticationId('login-gov', userinfo.email, function(err, user) {
            if (err) return next(err);

            if (!user || !user.active) {
              return res.sendStatus(403);
            }

            req.user = user;
            next();
          });
        })
        .catch(function(err) {
          log.error('not authenticated based on login.gov access token', err);
          res.sendStatus(403);
        });
    } else {
      return res.sendStatus(403);
    }
  }

  app.get(
    '/auth/login-gov/signin',
    function(req, res, next) {
      passport.authenticate('oidc-loa-1', {
        state: JSON.stringify({type: 'signin', id: crypto.randomBytes(32).toString('hex')})
      })(req, res, next);
    }
  );

  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/login-gov/devices',
    authorizeUser,
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

  app.post(
    '/auth/login-gov/authorize',
    authorizeUser,
    provision.check('login-gov'),
    parseLoginMetadata,
    function(req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function(err, token) {
        if (err) return next(err);

        const api = Object.assign({}, config.api);
        api.authenticationStrategies['login-gov'] = {
          url: api.authenticationStrategies['login-gov'].url,
          type: api.authenticationStrategies['login-gov'].type,
          title: api.authenticationStrategies['login-gov'].title,
          textColor: api.authenticationStrategies['login-gov'].textColor,
          buttonColor: api.authenticationStrategies['login-gov'].buttonColor,
          icon: api.authenticationStrategies['login-gov'].icon
        };

        res.json({
          user: req.user,
          device: req.provisionedDevice,
          token: token.token,
          expirationDate: token.expirationDate ,
          api: api
        });
      });

      req.session.destroy();
    }
  );

  app.get(
    '/auth/login-gov/callback/loa-1',
    authenticate,
    function(req, res) {
      res.render('authentication', { host: req.getRoot(), login: {user: req.user, oauth: { access_token: req.info.access_token}}});
    }
  );

};
