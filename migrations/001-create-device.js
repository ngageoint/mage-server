// Setup mongoose
var mongoose = require('mongoose')
  , Device = require('../models/device');

exports.up = function(next) {
  mongoose.connect('mongodb://localhost/sagedb');

  var device = {
    name: "Initial Device",
    uid: "12345",
    registered: true,
    description: "This is the initial device for the web console.  Please create a new device with a more secure unique id and delete this device."
  };

  Device.createDevice(device, function(err, device) {
    if (err) {
      mongoose.disconnect();
      return next(err);
    }

    mongoose.disconnect(function(err) {
      next(err);
    });
  });
};

exports.down = function(next) {
  mongoose.connect('mongodb://localhost/sagedb');

  Device.getDeviceByUid("12345", function(err, device) {
    if (err) {
      mongoose.disconnect();
      return next(err);
    }

    if (!device) {
      mongoose.disconnect();
      return next();
    }

    Device.deleteDevice(device, function(err, device) {
      mongoose.disconnect(next);
    });
  });
};