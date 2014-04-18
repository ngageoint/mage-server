module.exports = function(app, security) {
  var Device = require('../models/device')
    , User = require('../models/user')
    , access = require('../access');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , provision = security.provisioning.provision
    , loginStrategy = security.authentication.loginStrategy
    , authenticationStrategy = security.authentication.authenticationStrategy;

  var isAuthenticated = function(strategy) {
    return function(req, res, next) {
      p***REMOVED***port.authenticate(strategy, function(err, user, info) {
        if (err) return next(err);

        if (user) req.user = user;

        next();

      })(req, res, next);
    }
  }

  var isAuthorized = function(permission) {
    return function(req, res, next) {
      access.hasPermission(req.user, permission, function(err, hasPermission) {
        if (err) return next(err);

        if (!hasPermission) req.user = null;

        next();

      });
    }
  }

  var parseDeviceParams = function(req, res, next) {
    req.newDevice = {
      uid: req.param('uid'), 
      name: req.param('name'),
      registered: req.param('registered'),
      description: req.param('description'), 
      poc: req.param('poc')
    };

    next();
  }

  var validateDeviceParams = function(req, res, next) {
    if (!req.newDevice.uid) {
      return res.send(401, "missing required param 'uid'");
    }

    next();
  }

  // Create a new device (ADMIN)
  app.post(
    '/api/devices',
    isAuthenticated(authenticationStrategy),
    isAuthorized('CREATE_DEVICE'),
    parseDeviceParams,
    validateDeviceParams,
    function(req, res, next) {

      // If I did not authenticate a user go to the next route
      // '/api/devices' route which does not require authentication
      if (!req.user) return next();


      // Automatically register any device created by an ADMIN
      req.newDevice.registered = true;

      Device.createDevice(req.newDevice, function(err, device) {
        if (err) {
          return res.send(400, err.message);
        }

        res.json(device);
      });
    }
  );

  // Create a new device (Non-ADMIN)
  // Any authenticated user can create a new device, the registered field 
  // will be set to false.
  app.post(
    '/api/devices',
    p***REMOVED***port.authenticate(loginStrategy),
    parseDeviceParams,
    validateDeviceParams,
    function(req, res) {
      if (!req.newDevice.uid) return res.send(401, "missing required param 'uid'");

      // set poc to the user that is trying to create the device
      req.newDevice.poc = req.user._id;

      // Devices not created by ADMIN are not registered by default
      req.newDevice.registered = false;

      Device.getDeviceByUid(req.newDevice.uid, function(err, device) {
        if (device) {
          // already exists, do not register
          return res.json(device);
        }

        Device.createDevice(req.newDevice, function(err, newDevice) {
          if (err) {
            return res.send(400, err);
          }

          res.json(newDevice);
        });
      });
    }
  );

  // get all devices
  app.get(
    '/api/devices',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('READ_DEVICE'),
      function (req, res) {
      Device.getDevices(function (err, devices) {
        res.json(devices);
      });
  });

  // get device
  app.get(
    '/api/devices/:deviceId',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('READ_DEVICE'),
    function (req, res) {
      res.json(req.device);
    }
  );

  // Update a device
  app.put(
    '/api/devices/:id',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('UPDATE_DEVICE'),
    parseDeviceParams, 
    function(req, res) {
      var update = {};
      if (req.newDevice.uid) update.uid = req.newDevice.uid;
      if (req.newDevice.name) update.name = req.newDevice.name;
      if (req.newDevice.description) update.description = req.newDevice.description;
      if (req.newDevice.registered) update.registered = req.newDevice.registered;
      if (req.newDevice.poc) update.poc = req.newDevice.poc;

      Device.updateDevice(req.param('id'), update, function(err, device) {
        if (err) {
          return res.send(400, err);
        }

        res.json(device);
      });
    }
  );

  // Delete a device
  app.delete(
    '/api/devices/:id',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('DELETE_DEVICE'),
    function(req, res) {
      Device.deleteDevice(req.param('id'), function(err, device) {
        if (err) {
          return res.send(400, err);
        }

        res.json(device);
      });
    }
  );
}