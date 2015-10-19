module.exports = function(app, p***REMOVED***port, provisioning, googleStrategy) {

  var GoogleStrategy = require('p***REMOVED***port-google-oauth').OAuth2Strategy
    , Token = require('../models/token')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Role = require('../models/role')
    , api = require('../api')
    , config = require('../config.json');

  console.log('configuring google authentication');

  function authenticate(req, res, next) {
    p***REMOVED***port.authenticate('google', function(err, user, info) {
      if (err) return next(err);
      info = info || {};

      if (!user) {
        return res.render('authentication', { host: req.getRoot(), success: false, login: {errorMessage: info.message} });
      }

      req.user = user;
      next();
    })(req, res, next);
  }

  function provisionDevice(req, res, next) {
    var state = JSON.parse(req.query.state);

    provisioning.provision.check(provisioning.strategy, {uid: state.uid}, function(err, device) {
      if (err) return next(err);

      var device = {
        uid: state.uid,
        userId: req.user._id
      }

      if (provisioning.strategy === 'uid' && !device) {
        Device.createDevice(device, function(err, newDevice) {
          var msg = 'Your device needs to be registered, please contact your MAGE administrator.';
          return res.render('authentication', { host: req.getRoot(), success: true, login: {user: req.user, device: newDevice, errorMessage: msg}});
        });
      } else {
        req.device = device;
        next();
      }
    })(req, res, next);
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
              username: 'google' + profile.id,
              displayName: profile.name.givenName + ' ' + profile.name.familyName,
              email: email,
              active: false,
              roleId: role._id,
              authentication: {
                type: 'google',
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
        } else {
          return done(new Error("Unrecognized oauth state"));
        }
      });
    }
  ));

  app.get(
    '/auth/google/signup',
    p***REMOVED***port.authenticate('google', {
      scope : ['profile', 'email'],
      state: JSON.stringify({type: 'signup'}),
      prompt: 'select_account'
    })
  );

  app.get(
    '/auth/google/signin',
    function(req, res, next) {
      p***REMOVED***port.authenticate('google', {
        scope: 'https://www.googleapis.com/auth/plus.login', state: JSON.stringify({type: 'signin', uid: req.param('uid')}), prompt: 'select_account'
      })(req, res, next);
    }
  );

  app.get(
    '/auth/google/callback',
    authenticate,
    provisionDevice,
    function(req, res, next) {
      var state = JSON.parse(req.query.state);
      if (state.type === 'signup') {
        return res.render('authentication', { host: req.getRoot(), success: true, login: {user: user}});
      }

      new api.User().login(req.user, req.device, function(err, token) {
        if (err) return next(err);

        res.render('authentication', { host: req.getRoot(), success: true, login: {user: req.user, token: token.token}});
      });
    }
  );

}
