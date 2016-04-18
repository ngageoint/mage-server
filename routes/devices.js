var DeviceModel = require('../models/device')
  , access = require('../access');

function DeviceResource() {}

module.exports = function(app, security) {

  var passport = security.authentication.passport;
  var resource = new DeviceResource(passport);

  // Create a new device, requires CREATE_DEVICE role
  app.post('/api/devices',
    resource.isAuthenticated(passport, 'bearer'),
    resource.parseDeviceParams,
    resource.validateDeviceParams,
    resource.createWithAccess
  );

  // Create a new device
  // Any authenticated user can create a new device, the registered field
  // will be set to false.
  app.post('/api/devices',
    passport.authenticate('local'),
    resource.create
  );

  app.get('/api/devices/count',
    passport.authenticate('bearer'),
    access.authorize('READ_DEVICE'),
    resource.count
  );

  // get all devices
  app.get('/api/devices',
    passport.authenticate('bearer'),
    access.authorize('READ_DEVICE'),
    resource.getDevices
  );

  // get device
  app.get('/api/devices/:deviceId',
    passport.authenticate('bearer'),
    access.authorize('READ_DEVICE'),
    resource.getDevice
  );

  // Update a device
  app.put('/api/devices/:id',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_DEVICE'),
    resource.parseDeviceParams,
    resource.updateDevice
  );

  // Delete a device
  app.delete('/api/devices/:id',
    passport.authenticate('bearer'),
    access.authorize('DELETE_DEVICE'),
    resource.deleteDevice
  );
};

DeviceResource.prototype.createWithAccess = function(req, res, next) {
  // If I did not authenticate a user go to the next route
  // '/api/devices' route which does not require authentication
  if (!access.userHasPermission(req.user, 'CREATE_DEVICE')) {
    return next();
  }

  // Automatically register any device created by an ADMIN
  req.newDevice.registered = true;

  DeviceModel.createDevice(req.newDevice, function(err, device) {
    if (err) return next(err);

    res.json(device);
  });
};

DeviceResource.prototype.create = function(req, res, next) {
  var newDevice = {
    uid: req.param('uid'),
    name: req.param('name'),
    registered: false,
    description: req.param('description'),
    userId: req.user.id
  };

  DeviceModel.getDeviceByUid(newDevice.uid, function(err, device) {
    if (err) return next(err);

    if (device) {
      // already exists, do not register
      return res.json(device);
    }

    DeviceModel.createDevice(newDevice, function(err, newDevice) {
      if (err) return next(err);

      res.json(newDevice);
    });
  });
};

DeviceResource.prototype.count = function (req, res, next) {
  DeviceModel.count(function (err, count) {
    if (err) return next(err);

    res.json({count: count});
  });
};

DeviceResource.prototype.getDevices = function (req, res, next) {
  var filter = {};
  if (req.query.registered === 'true' || req.query.registered === 'false') {
    filter.registered = req.query.registered === 'true';
  }

  var expand = {};
  if (req.query.expand) {
    var expandList = req.query.expand.split(",");
    if (expandList.some(function(e) { return e === 'user';})) {
      expand.user = true;
    }
  }

  DeviceModel.getDevices({filter: filter, expand: expand}, function (err, devices) {
    if (err) return next(err);

    res.json(devices);
  });
};

DeviceResource.prototype.getDevice =function (req, res) {
  res.json(req.device);
};

DeviceResource.prototype.updateDevice = function(req, res, next) {
  var update = {};
  if (req.newDevice.uid) update.uid = req.newDevice.uid;
  if (req.newDevice.name) update.name = req.newDevice.name;
  if (req.newDevice.description) update.description = req.newDevice.description;
  if (req.newDevice.registered) update.registered = req.newDevice.registered;
  if (req.newDevice.userId) update.userId = req.newDevice.userId;

  DeviceModel.updateDevice(req.param('id'), update, function(err, device) {
    if (err) return next(err);

    res.json(device);
  });
};

DeviceResource.prototype.deleteDevice = function(req, res, next) {
  DeviceModel.deleteDevice(req.param('id'), function(err, device) {
    if (err) return next(err);

    if (!device) return res.sendStatus(404);

    res.json(device);
  });
};

DeviceResource.prototype.isAuthenticated = function(passport, strategy) {
  return function(req, res, next) {
    passport.authenticate(strategy, function(err, user) {
      if (err) return next(err);

      if (user) req.user = user;

      next();

    })(req, res, next);
  };
};

DeviceResource.prototype.parseDeviceParams = function(req, res, next) {
  req.newDevice = {
    uid: req.param('uid'),
    name: req.param('name'),
    registered: req.param('registered'),
    description: req.param('description'),
    userId: req.param('userId')
  };

  next();
};

DeviceResource.prototype.validateDeviceParams = function(req, res, next) {
  if (!req.newDevice.uid) {
    return res.status(400).send("missing required param 'uid'");
  }

  next();
};
