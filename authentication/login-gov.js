module.exports = function(app, passport, provisioning) {

  var fs = require('fs')
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

  var strategyConfig = config.api.authenticationStrategies['login-gov'];
  log.info('Configuring login.gov authentication', strategyConfig);
  let loginGov = {};

  var key = fs.readFileSync(strategyConfig.keyFile, 'ascii');
  var jwk = pem2jwk(key);
  var keys = [jwk];

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

  var client;
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

    var params = getParams();
    passport.use('oidc-loa-1', new Strategy({client: client, params: params, passReqToCallback: true}, function(req, tokenset, userinfo, done) {
      userinfo.token = tokenset.id_token; // required for RP-Initiated Logout
      userinfo.state = params.state; // required for RP-Initiated Logout

      User.getUserByAuthenticationId('login-gov', userinfo.email, function(err, user) {
        if (err) return done(err);

        var email = userinfo.email;

        if (!user) {
          // Create an account for the user
          Role.getRole('USER_ROLE', function(err, role) {
            if (err) return done(err);

            var user = {
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

            User.createUser(user, function(err, newUser) {
              return done(err, newUser);
            });
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
    var options = {};
    options.userAgent = req.headers['user-agent'];
    options.appVersion = req.param('appVersion');

    req.loginOptions = options;
    next();
  }

  function authenticate(req, res, next) {
    passport.authenticate('oidc-loa-1', function(err, user, info) {
      if (err) return next(err);
      req.user = user;
      req.info = info || {};

      next();
    })(req, res, next);
  }

  function authorizeUser(req, res, next) {
    var token = req.param('access_token');
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
    '/auth/login-gov/authorize',
    authorizeUser,
    authorizeDevice,
    parseLoginMetadata,
    function(req, res, next) {
      new api.User().login(req.user, req.device, req.loginOptions, function(err, token) {
        if (err) return next(err);

        var api = Object.assign({}, config.api);
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
          device: req.device,
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
      res.render('authentication', { host: req.getRoot(), success: true, login: {user: req.user, oauth: { access_token: req.info.access_token}}});
    }
  );

};
