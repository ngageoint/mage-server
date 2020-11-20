module.exports = function (app, passport, provision, strategyConfig, tokenService) {

  const GeoaxisStrategy = require('passport-geoaxis-oauth20').Strategy
    , User = require('../models/user')
    , Device = require('../models/device')
    , Role = require('../models/role')
    , TokenAssertion = require('./verification').TokenAssertion
    , api = require('../api')
    , config = require('../config.js')
    , log = require('../logger');

  log.info('Configuring GeoAxis authentication');

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.header['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  function authenticate(req, res, next) {
    passport.authenticate('geoaxis', function (err, user, info = {}) {
      if (err) return next(err);

      req.user = user;

      // For inactive or disabled accounts don't generate an authorization token
      if (!user.active || !user.enabled) {
        log.warn('Failed user login attempt: User ' + user.username + ' account is inactive or disabled.');
        return next();
      }

      // DEPRECATED session authorization, remove req.login which creates session in next version
      req.login(user, function (err) {
        tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
          .then(token => {
            req.token = token;
            req.user = user;
            req.info = info;
            next();
          }).catch(err => {
            next(err);
          });
      });
    })(req, res, next);
  }

  const strategy = new GeoaxisStrategy({
    authorizationURL: strategyConfig.authorizationUrl + '/ms_oauth/oauth2/endpoints/oauthservice/authorize',
    tokenURL: strategyConfig.apiUrl + '/ms_oauth/oauth2/endpoints/oauthservice/tokens',
    userProfileURL: strategyConfig.apiUrl + '/ms_oauth/resources/userprofile/me',
    clientID: strategyConfig.clientID,
    clientSecret: strategyConfig.clientSecret,
    callbackURL: strategyConfig.callbackUrl,
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    const geoaxisUser = profile._json;
    User.getUserByAuthenticationStrategy('geoaxis', geoaxisUser.email, function(err, user) {
      if (err) return done(err);

      const email = geoaxisUser.email;

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
              type: 'geoaxis',
              id: email
            }
          };

          new api.User().create(user).then(newUser => {
            return done(null, newUser);
          }).catch(err => done(err));
        });
      } else if (!user.active) {
        log.warn('Failed user login attempt: User ' + user.username + ' account is not active.');
        return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account."} );
      } else {
        return done(null, user);
      }
    });
  });

  passport.use('geoaxis', strategy);

  app.get(
    '/auth/geoaxis/signin',
    function (req, res, next) {
      passport.authenticate('geoaxis', {
        state: req.query.state
      })(req, res, next);
    }
  );

  // DEPRECATED, this will be removed in next major server version release
  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/geoaxis/devices',
    function (req, res, next) {
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
    '/auth/geoaxis/authorize',
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
    provision.check('geoaxis'),
    parseLoginMetadata,
    function(req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function(err, token) {
        if (err) return next(err);

        const api = Object.assign({}, config.api);
        api.authenticationStrategies['geoaxis'] = {
          url: api.authenticationStrategies['geoaxis'].url,
          type: api.authenticationStrategies['geoaxis'].type,
          title: api.authenticationStrategies['geoaxis'].title,
          textColor: api.authenticationStrategies['geoaxis'].textColor,
          buttonColor: api.authenticationStrategies['geoaxis'].buttonColor,
          icon: api.authenticationStrategies['geoaxis'].icon
        };

        res.json({
          user: req.user,
          device: req.provisionedDevice,
          token: token.token,
          expirationDate: token.expirationDate,
          api: api
        });
      });

      req.session = null;
    }
  );

  app.get(
    '/auth/geoaxis/callback',
    authenticate,
    function (req, res) {
      if (req.query.state === 'mobile') {
        let uri;
        if (!req.user.active || !req.user.enabled) {
          uri = `mage://app/invalid_account?active=${req.user.active}&enabled=${req.user.enabled}`;
        } else {
          uri = `mage://app/authentication?token=${req.token}`
        }

        res.render('geoaxis', { uri: uri });
      } else {
        res.render('authentication', { host: req.getRoot(), login: { token: req.token, user: req.user } });
      }
    }
  );

};
