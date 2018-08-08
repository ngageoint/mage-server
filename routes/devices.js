var DeviceModel = require('../models/device')
  , access = require('../access');

function DeviceResource() {}

module.exports = function(app, security) {

  var passport = security.authentication.passport;
  var resource = new DeviceResource(passport);

  // Create a new device, requires CREATE_DEVICE role
  app.post('/api/devices',
    passport.authenticate('bearer'),
    resource.parseDeviceParams,
    resource.validateDeviceParams,
    resource.createWithAccess
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

DeviceResource.prototype.createWithAccess = function(req, res, next) {
  // If I did not authenticate a user go to the next route
  // '/api/devices' route which does not require authentication
  if (!access.userHasPermission(req.user, 'CREATE_DEVICE')) {
    return next();
  }

  // Automatically register any device created by an ADMIN
  req.newDevice.registered = true;

  console.log('create ADMIN device');
  DeviceModel.createDevice(req.newDevice)
    .then(device => {
      console.log('created a ADMIN device');
      res.json(device);
    })
    .catch(err => next(err));
};

DeviceResource.prototype.count = function (req, res, next) {
  DeviceModel.count()
    .then(count => res.json({count: count}))
    .catch(err => next(err));
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
