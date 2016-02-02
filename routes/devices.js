module.exports = function(app, security) {
  var Device = require('../models/device')
    , access = require('../access');

  var passport = security.authentication.passport;

  var isAuthenticated = function(strategy) {
    return function(req, res, next) {
      passport.authenticate(strategy, function(err, user) {
        if (err) return next(err);

        if (user) req.user = user;

        next();

      })(req, res, next);
    };
  };

  var parseDeviceParams = function(req, res, next) {
    req.newDevice = {
      uid: req.param('uid'),
      name: req.param('name'),
      registered: req.param('registered'),
      description: req.param('description'),
      userId: req.param('userId')
    };

    next();
  };

  var validateDeviceParams = function(req, res, next) {
    if (!req.newDevice.uid) {
      return res.send(401, "missing required param 'uid'");
    }

    next();
  };

  // Create a new device, requires CREATE_DEVICE role
  app.post(
    '/api/devices',
    isAuthenticated('bearer'),
    parseDeviceParams,
    validateDeviceParams,
    function(req, res, next) {
      // If I did not authenticate a user go to the next route
      // '/api/devices' route which does not require authentication
      if (!access.userHasPermission(req.user, 'CREATE_DEVICE')) {
        return next();
      }

      // Automatically register any device created by an ADMIN
      req.newDevice.registered = true;

      Device.createDevice(req.newDevice, function(err, device) {
        if (err) return next(err);

        res.json(device);
      });
    }
  );

  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post(
    '/api/devices',
    passport.authenticate('local'),
    function(req, res, next) {
      var newDevice = {
        uid: req.param('uid'),
        name: req.param('name'),
        registered: false,
        description: req.param('description'),
        userId: req.user.id
      };

      if (!newDevice.uid) return res.send(401, "missing required param 'uid'");

      Device.getDeviceByUid(newDevice.uid, function(err, device) {
        if (err) return next(err);

        if (device) {
          // already exists, do not register
          return res.json(device);
        }

        Device.createDevice(newDevice, function(err, newDevice) {
          if (err) return next(err);

          res.json(newDevice);
        });
      });
    }
  );

  // get all devices
  app.get(
    '/api/devices',
    passport.authenticate('bearer'),
    access.authorize('READ_DEVICE'),
    function (req, res, next) {
      var filter = {};
      if (req.query.registered === 'true') {
        filter.registered = true;
      }

      if (req.query.registered === 'false') {
        filter.registered = false;
      }

      var expand = {};
      if (req.query.expand) {
        var expandList = req.query.expand.split(",");
        if (expandList.some(function(e) { return e === 'user';})) {
          expand.user = true;
        }
      }

      Device.getDevices({filter: filter, expand: expand}, function (err, devices) {
        if (err) return next(err);

        res.json(devices);
      });
    }
  );

  app.get(
    '/api/devices/count',
    passport.authenticate('bearer'),
    access.authorize('READ_DEVICE'),
    function (req, res, next) {
      Device.count(function (err, count) {
        if (err) return next(err);

        res.json({count: count});
      });
    }
  );

  // get device
  app.get(
    '/api/devices/:deviceId',
    passport.authenticate('bearer'),
    access.authorize('READ_DEVICE'),
    function (req, res) {
      res.json(req.device);
    }
  );

  // Update a device
  app.put(
    '/api/devices/:id',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_DEVICE'),
    parseDeviceParams,
    function(req, res, next) {
      var update = {};
      if (req.newDevice.uid) update.uid = req.newDevice.uid;
      if (req.newDevice.name) update.name = req.newDevice.name;
      if (req.newDevice.description) update.description = req.newDevice.description;
      if (req.newDevice.registered) update.registered = req.newDevice.registered;
      if (req.newDevice.userId) update.userId = req.newDevice.userId;

      Device.updateDevice(req.param('id'), update, function(err, device) {
        if (err) return next(err);

        res.json(device);
      });
    }
  );

  // Delete a device
  app.delete(
    '/api/devices/:id',
    passport.authenticate('bearer'),
    access.authorize('DELETE_DEVICE'),
    function(req, res, next) {
      Device.deleteDevice(req.param('id'), function(err, device) {
        if (err) return next(err);

        if (!device) return res.sendStatus(404);

        res.json(device);
      });
    }
  );
};
