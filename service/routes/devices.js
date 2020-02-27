var DeviceModel = require('../models/device')
  , access = require('../access');

function DeviceResource() {}

module.exports = function(app, security) {

  var passport = security.authentication.passport;
  var resource = new DeviceResource(passport);

  /**
   * Create a new device, requires CREATE_DEVICE role
   *
   * @deprecated Use /auth/{strategy}/authorize instead.
   */
  app.post('/api/devices',
    passport.authenticate('bearer'),
    resource.ensurePermission('CREATE_DEVICE'),
    resource.parseDeviceParams,
    resource.validateDeviceParams,
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
  // TODO: check for READ_USER also
  app.get('/api/devices/:id',
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

DeviceResource.prototype.ensurePermission = function(permission) {
  return function(req, res, next) {
    access.userHasPermission(req.user, permission) ? next() : res.sendStatus(403);
  };
};

/**
 * TODO: this should return a 201 and a location header
 *
 * @deprecated Use /auth/{strategy}/authorize instead.
 */
DeviceResource.prototype.create = function(req, res, next) {
  console.warn("Calling deprecated function to create device.  Call authorize instead.");

  // Automatically register any device created by an ADMIN
  req.newDevice.registered = true;

  DeviceModel.createDevice(req.newDevice)
    .then(device => {
      res.json(device);
    })
    .catch(err => next(err));
};

DeviceResource.prototype.count = function (req, res, next) {
  DeviceModel.count()
    .then(count => res.json({count: count}))
    .catch(err => next(err));
};

/**
 * TODO:
 * * the /users route uses the `populate` query param while this uses
 *   `expand`; should be consistent
 * * openapi supports array query parameters using the pipe `|` delimiter;
 *   use that instead of comma for the `expand` query param. on the other hand,
 *   this only actually supports a singular `expand` key, so why bother with
 *   the split anyway?
 */
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

  DeviceModel.getDevices({filter: filter, expand: expand})
    .then(devices => res.json(devices))
    .catch(err => next(err));
};

DeviceResource.prototype.getDevice = function(req, res, next) {
  var expand = {};
  if (req.query.expand) {
    var expandList = req.query.expand.split(",");
    if (expandList.some(function(e) { return e === 'user';})) {
      expand.user = true;
    }
  }

  DeviceModel.getDeviceById(req.params.id, {expand: expand})
    .then(device => res.json(device))
    .catch(err => next(err));
};

DeviceResource.prototype.updateDevice = function(req, res, next) {
  var update = {};
  if (req.newDevice.uid) update.uid = req.newDevice.uid;
  if (req.newDevice.name) update.name = req.newDevice.name;
  if (req.newDevice.description) update.description = req.newDevice.description;
  if (req.newDevice.registered !== undefined) update.registered = req.newDevice.registered;
  if (req.newDevice.userId) update.userId = req.newDevice.userId;

  DeviceModel.updateDevice(req.param('id'), update)
    .then(device => res.json(device))
    .catch(err => next(err));
};

DeviceResource.prototype.deleteDevice = function(req, res, next) {
  DeviceModel.deleteDevice(req.param('id'))
    .then(device => {
      if (!device) return res.sendStatus(404);

      res.json(device);
    })
    .catch(err => next(err));
};

DeviceResource.prototype.parseDeviceParams = function(req, res, next) {
  req.newDevice = {
    uid: req.param('uid'),
    name: req.param('name'),
    description: req.param('description'),
    userId: req.param('userId')
  };

  if (req.param('registered') !== undefined) {
    req.newDevice.registered = req.param('registered') === 'true';
  }

  next();
};

DeviceResource.prototype.validateDeviceParams = function(req, res, next) {
  if (!req.newDevice.uid) {
    return res.status(400).send("missing required param 'uid'");
  }

  next();
};
