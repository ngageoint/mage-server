module.exports = function(app, passport, provisioning, googleStrategy) {

  var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
    , GoogleAuth = require('google-auth-library')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Role = require('../models/role')
    , api = require('../api')
    , config = require('../config.js')
    , userTransformer = require('../transformers/user');

  var auth = new GoogleAuth();
  var googleClient = new auth.OAuth2(googleStrategy.clientID, '', '');

  console.log('configuring google authentication');

  function parseLoginMetadata(req, res, next) {

    var options = {};
    options.userAgent = req.headers['user-agent'];
    options.appVersion = req.param('appVersion');

    req.loginOptions = options;
    next();
  }

  function authenticate(req, res, next) {
    console.log('verify the google user', req.param('token'));
    googleClient.verifyIdToken(
      req.param('token'),
      googleStrategy.clientID,
      function(err) {
        if (err) {
          // user token did not validate so do not proceed
          return next(err);
        }

        User.getUserByAuthenticationId('google', req.param('userID'), function(err, user) {
          if (err) return next(err);

          if (!user) {
            var error = new Error('User does not exist, please create an account first');
            error.status = 400;
            return next(error);
          }

          if (!user.active) {
            var inactiveError = new Error('User is not approved, please contact your MAGE administrator');
            inactiveError.status = 400;
            return next(inactiveError);
          }

          req.user = user;
          next();
        });
      }
    );
  }

  function provisionDevice(req, res, next) {
    // var state = JSON.parse(req.query.state);
    // if (state.type === 'signup') {
    //   return next();
    // }

    provisioning.provision.check(provisioning.strategy, {uid: req.param('uid')}, function(err, device) {
      if (err) return next(err);

      if (provisioning.strategy === 'uid' && (!device || !device.registered)) {
        Device.createDevice({ uid: req.param('uid'), userId: req.user._id, appVersion: req.loginOptions.appVersion, userAgent: req.loginOptions.userAgent}, function(err, newDevice) {
          return res.json({device: newDevice, errorMessage: 'Your device needs to be registered, please contact your MAGE administrator.'});
        });
      } else {
        req.device = device;
        next();
      }
    })(req, res, next);
  }

  passport.use('google', new GoogleStrategy({
    passReqToCallback: true,
    clientID: googleStrategy.clientID,
    clientSecret: googleStrategy.clientSecret,
    callbackURL: googleStrategy.callbackURL
  },
  function(req, accessToken, refreshToken, profile, done) {
    req.googleToken = accessToken;

    var state = JSON.parse(req.query.state);
    console.log('state', state);
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
          };

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
  }));

  app.post(
    '/auth/google/signup',
    function (req, res, next) {
      console.log('verify the google user', req.param('token'));
      googleClient.verifyIdToken(
        req.param('token'),
        googleStrategy.clientID,
        function(e, login) {
          if (e) {
            // user token did not validate so do not proceed
            return res(e);
          }
          var payload = login.getPayload();
          var userId = payload['sub'];
          User.getUserByAuthenticationId('google', req.param('userID'), function(err, user) {
            console.log('user', user);
            if (err) return next(err);

            if (user) {
              var error = new Error('User already exists');
              error.status = 400;
              return next(error);
            }

            Role.getRole('USER_ROLE', function(err, role) {
              if (err) return next(err);

              // profile.emails.forEach(function(e) {
              //   if (e.type === 'account') {
              //     email = e.value;
              //   }
              // });

              // create an account for the user
              var user = {
                username: 'google' + userId,
                displayName: req.param('displayName'),
                email: req.param('email'),
                active: false,
                roleId: role._id,
                authentication: {
                  type: 'google',
                  id: req.param('userID')
                }
              };
              var phone = req.param('phone');
              if (phone) {
                user.phones = [{
                  type: "Main",
                  number: phone
                }];
              }

              User.createUser(user, function(err, newUser) {
                if (err) return next(err);
                return res.json(newUser);
              });
            });
          });
        }
      );
    }
    // passport.authenticate('google', {
    //   scope : ['profile', 'email'],
    //   state: JSON.stringify({type: 'signup'}),
    //   prompt: 'select_account'
    // })
  );

  app.post(
    '/auth/google/signin',
    authenticate,
    parseLoginMetadata,
    provisionDevice,
    function(req, res, next) {
      new api.User().login(req.user,  req.provisionedDevice, req.loginOptions, function(err, token) {
        if (err) return next(err);

        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()}),
          api: config.api
        });
      });
    }
  );

  app.get(
    '/auth/google/callback',
    authenticate,
    function(req, res, next) {
      var state = JSON.parse(req.query.state);
      if (state.type === 'signup') {
        return res.render('authentication', { host: req.getRoot(), success: true, login: {user: req.user}});
      }

      new api.User().login(req.user, req.device, function(err, token) {
        if (err) return next(err);

        res.render('authentication', { host: req.getRoot(), success: true, login: {user: req.user, token: token.token, expirationDate: token.expirationDate}});
      });
    }
  );

};
