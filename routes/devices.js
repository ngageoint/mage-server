module.exports = function(app, auth) {
  var Device = require('../models/device')
    , User = require('../models/user');

  var p***REMOVED***port = auth.p***REMOVED***port;

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

    var pocId = req.param('pocId');

    req.deviceParam = {uid: uid, name: name, description: description, poc: pocId};
    next();
  }

  // get all devices
  app.get(
    '/api/devices', 
    p***REMOVED***port.authenticate('bearer'), 
      function (req, res) {
      Device.getDevices(function (err, devices) {
        res.json(devices);
      });
  });

  // get device
  app.get(
    '/api/devices/:deviceUid', 
    p***REMOVED***port.authenticate('bearer'), 
    function (req, res) {
      res.json(req.device);
    }
  );

  // Create a new device
  app.post(
    '/api/devices',
    validateDeviceParams,
    p***REMOVED***port.authenticate('bearer'),
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
    '/api/devices/:deviceUid',
    p***REMOVED***port.authenticate('bearer'),
    validateDeviceParams, 
    function(req, res) {
      console.log('got device: ' + JSON.stringify(req.device) + ' with _id ' + req.device._id);
      Device.updateDevice(req.device._id, req.deviceParam, function(err, device) {
        if (err) {
          return res.send(400, err);
        }

        res.json(device);
      });
    }
  );

  // Delete a device
  app.delete(
    '/api/devices/:deviceUid', 
    p***REMOVED***port.authenticate('bearer'),
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