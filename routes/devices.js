module.exports = function(app, auth) {
  var Device = require('../models/device')
    , User = require('../models/user')
    , access = require('../access');

  var p***REMOVED***port = auth.p***REMOVED***port;

  app.all('/api/devices*', p***REMOVED***port.authenticate('bearer'));

  var validateDeviceParams = function(req, res, next) {
    var uid = req.param('uid');
    if (!uid) {
      return res.send(400, "cannot create device 'uid' param not specified");
    }

    var name = req.param('name');
    if (!name) {
      return res.send(400, "cannot create device 'name' param not specified");
    }

    var description = req.param('description');

    var poc = req.param('pocId');

    req.deviceParam = {uid: uid, name: name, description: description, poc: poc};
    next();
  }

  // get all devices
  app.get(
    '/api/devices',
    access.hasPermission('READ_DEVICE'),
      function (req, res) {
      Device.getDevices(function (err, devices) {
        res.json(devices);
      });
  });

  // get device
  app.get(
    '/api/devices/:deviceId', 
    access.hasPermission('READ_DEVICE'),
    function (req, res) {
      res.json(req.device);
    }
  );

  // Create a new device
  app.post(
    '/api/devices',
    validateDeviceParams,
    access.hasPermission('CREATE_DEVICE'),
    function(req, res) {
      Device.createDevice(req.deviceParam, function(err, device) {
        if (err) {
          return res.send(400, err);
        }

        res.json(device);
      });
    }
  );

  // Update a device
  app.put(
    '/api/devices/:deviceId',
    access.hasPermission('UPDATE_DEVICE'),
    validateDeviceParams, 
    function(req, res) {
      var update = {};
      if (req.deviceParam.uid) update.uid = req.deviceParam.uid;
      if (req.deviceParam.name) update.name = req.deviceParam.name;
      if (req.deviceParam.description) update.description = req.deviceParam.description;
      if (req.deviceParam.poc) update.poc = req.deviceParam.poc;

      Device.updateDevice(req.device._id, update, function(err, device) {
        if (err) {
          return res.send(400, err);
        }

        res.json(device);
      });
    }
  );

  // Delete a device
  app.delete(
    '/api/devices/:deviceId', 
    access.hasPermission('DELETE_DEVICE'),
    function(req, res) {
      Device.deleteDevice(req.device, function(err, device) {
        if (err) {
          return res.send(400, err);
        }

        res.json(device);
      });
    }
  );
}