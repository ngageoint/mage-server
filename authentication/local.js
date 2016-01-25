module.exports = function(app, passport, provisioning) {

  var log = require('winston')
    , LocalStrategy = require('passport-local').Strategy
    , User = require('../models/user')
    , Device = require('../models/device')
    , api = require('../api')
    , userTransformer = require('../transformers/user');

  passport.use(new LocalStrategy(
    function(username, password, done) {
      User.getUserByUsername(username, function(err, user) {
        if (err) { return done(err); }

        if (!user) {
          log.warn('Failed login attempt: User with username ' + username + ' not found');
          return done(null, false, { message: "User with username '" + username + "' not found" });
        }

        if (!user.active) {
          log.warn('Failed user login attempt: User ' + user.username + ' is not active');
          return done(null, false, { message: "User with username '" + username + "' not active" });
        }

        user.validPassword(password, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (!isValid) {
            log.warn('Failed login attempt: User with username ' + username + ' provided an invalid password');
            return done(null, false);
          }

          return done(null, user);
        });
      });
    }
  ));

  app.post(
    '/api/login',
    passport.authenticate('local'),
    provisioning.provision.check(provisioning.strategy),
    function(req, res) {
      new api.User().login(req.user,  req.provisionedDevice, function(err, token) {
        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()})
        });
      });
    }
  );


  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post(
    '/api/devices',
    passport.authenticate('local'),
    function(req, res) {
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
          return res.json(device);
        }

        Device.createDevice(newDevice, function(err, newDevice) {
          if (err) {
            return res.status(400);
          }

          res.json(newDevice);
        });
      });
    }
  );
};
