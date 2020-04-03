module.exports = function (app, passport, provision, strategyConfig) {

  const GeoaxisStrategy = require('passport-geoaxis-oauth20').Strategy
    , crypto = require('crypto')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Role = require('../models/role')
    , api = require('../api')
    , config = require('../config.js')
    , log = require('../logger');

  log.info('Configuring GeoAxis authentication');

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
    User.getUserByAuthenticationId('geoaxis', geoaxisUser.email, function(err, user) {
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

          User.createUser(user, function(err, newUser) {
            return done(err, newUser);
          });
        });
      } else if (!user.active) {
        return done(null, user, { message: "User is not approved, please contact your MAGE administrator to approve your account."} );
      } else {
        return done(null, user, {access_token: accessToken});
      }
    });
  });

  passport.use('geoaxis', strategy);

  app.get('/auth/geoaxis/signin', passport.authenticate('geoaxis'));

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.header['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  function authenticate(req, res, next) {
    passport.authenticate('geoaxis', function(err, user, info = {}) {
      if (err) return next(err);

      req.info = info;

      req.login(user, next);
    })(req, res, next);
  }

  function authorizeUser(req, res, next) {
    const token = req.param('access_token');

    if (req.user) {
      next();
    } else if (token) {
      log.warn('DEPRECATED - authorization with access_token has been deprecated, please use a session');

      strategy.userProfile(token, function(err, profile) {
        if (err) {
          log.error('Not authenticated based on geoaxis access token', err);
          return res.sendStatus(403);
        }

        const geoaxisUser = profile._json;
        User.getUserByAuthenticationId('geoaxis', geoaxisUser.email, function(err, user) {
          if (err) return next(err);

          if (!user || !user.active) {
            return res.sendStatus(403);
          }

          req.user = user;
          next();
        });
      });
    } else {
      return res.sendStatus(403);
    }
  }

  app.get(
    '/auth/geoaxis/signup',
    function(req, res, next) {
      passport.authenticate('geoaxis', {
        state: JSON.stringify({type: 'signup', id: crypto.randomBytes(32).toString('hex')})
      })(req, res, next);
    }
  );

  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/auth/geoaxis/devices',
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
    '/auth/geoaxis/authorize',
    authorizeUser,
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
          expirationDate: token.expirationDate ,
          api: api
        });
      });

      req.session = null;
    }
  );

  app.get(
    '/auth/geoaxis/callback',
    authenticate,
    function(req, res) {
      res.render('authentication', { host: req.getRoot(), success: true, login: {user: req.user, oauth: { access_token: req.info.access_token}}});
    }
  );

};
