module.exports = function(app, p***REMOVED***port, provisioning, googleStrategy) {

  var GoogleStrategy = require('p***REMOVED***port-google-oauth').OAuth2Strategy
    , Token = require('../models/token')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Role = require('../models/role')
    , api = require('../api')
    , config = require('../config.json');

  console.log('configuring google authentication');

  function validateDevice(req, res, next) {
    var state = JSON.parse(req.query.state);

    if (state.type === 'signin') {
      provisioning.provision.check(provisioning.strategy, {uid: state.uid})(req, res, next);
    } else {
      return next();
    }
  }

  p***REMOVED***port.use('google', new GoogleStrategy({
      p***REMOVED***ReqToCallback: true,
      clientID: googleStrategy.clientID,
      clientSecret: googleStrategy.clientSecret,
      callbackURL: googleStrategy.callbackURL
    },
    function(req, accessToken, refreshToken, profile, done) {
      req.googleToken = accessToken;

      var state = JSON.parse(req.query.state);
      User.getUserByAuthenticationId('google', profile.id, function(err, user) {
        if (err) return done(err);

        if (state.type === 'signup') {
          if (user) return done(null, false, { message: "User already exists" });

          Role.getRole('USER_ROLE', function(err, role) {
            if (err) return done(err);

            var email = null;
            profile.emails.forEach(function(e) {
              if (e.type === 'account') {
                email = e.value;
              }
            });

            // create an account for the user
            var user = {
              username: profile.provider + profile.id,
              displayName: profile.name.givenName + ' ' + profile.name.familyName,
              email: email,
              active: false,
              roleId: role._id,
              authentication: {
                type: profile.provider,
                id: profile.id
              }
            }

            User.createUser(user, function(err, newUser) {
              return done(err, newUser);
            });
          });

        } else  if (state.type === 'signin') {
          if (!user) return  done(null, false, { message: "User does not exist, please create an account first"} );

          if (!user.active) return done(null, false, { message: "User is not approved, please contact your MAGE administrator"} );

          return done(null, user);
        } else if (state.type === 'register') {
          if (!user) return  done(null, false, { message: "User does not exist, please create an account first"} );

          var newDevice = {
            uid: req.param('uid'),
            name: req.param('name'),
            registered: false,
            description: req.param('description'),
            userId: req.user.id
          };

          if (!newDevice.uid) return res.send(401, "missing required param 'uid'");

          Device.getDeviceByUid(newDevice.uid, function(err, device) {
            if (device) {
              // already exists, do not register
              return done(err, user, { device: device });
            }

            Device.createDevice(newDevice, function(err, newDevice) {
              done(err, user, { device: newDevice });
            });
          });
        } else {
          return done(new Error("Unrecognized oauth state"));
        }
      });
    }
  ));

  app.get(
    '/auth/google/signup',
    p***REMOVED***port.authorize('google', { scope : ['profile', 'email'], state: JSON.stringify({type: 'signup'}), prompt: 'select_account' }),
    function(req, res, next) {
      // The request will be redirected to Google for authentication, so this
      // function will not be called.
    }
  );

  app.get(
    '/auth/google/signin',
    function(req, res, next) {
      var state = {
        type: 'signin'
      };
      if (config.api.provision.strategy === 'uid') {
        state.uid = req.query.uid;
      }

      p***REMOVED***port.authenticate('google', {
        scope: 'https://www.googleapis.com/auth/plus.login', state: JSON.stringify(state), prompt: 'select_account'
      })(req, res, next);
    }
  );

  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post(
    '/auth/google/device',
    p***REMOVED***port.authenticate('google', { scope: 'https://www.googleapis.com/auth/plus.login', state: JSON.stringify({type: 'register'}), prompt: 'select_account'}),
    function(req, res, next) {
      // The request will be redirected to Google for authentication, so this
      // function will not be called.
    }
  );

  app.get(
    '/auth/google/callback',
    validateDevice,
    function(req, res, next) {
      p***REMOVED***port.authenticate('google', function(err, user, info) {
        if (err) return next(err);
        info = info || {};

        if (!user) {
          return res.render('authentication', { host: req.getRoot(), success: false, login: {errorMessage: info.message} });
        }

        req.user = user;
        var state = JSON.parse(req.query.state);
        if (state.type === 'register') {
          if (config.api.provision.strategy === 'uid') {
            return res.render('authentication', { host: req.getRoot(), success: true, login: {user: user, device: info.device}});
          }
        } else if (state.type === 'signup') {
          return res.render('authentication', { host: req.getRoot(), success: true, login: {user: user}});
        }

        new api.User().login(user, req.provisionedDevice, function(err, token) {
          if (err) return next(err);

          res.render('authentication', { host: req.getRoot(), success: true, login: {user: user, token: token.token}});
        });
      })(req, res, next);
    }
  );

}
