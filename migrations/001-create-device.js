// Setup mongoose
var mongoose = require('mongoose')
  , Device = require('../models/device')
  , server = require('../config').server;

exports.up = function(next) {
  mongoose.connect(server.mongodb.url);

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
  mongoose.connect(server.mongodb.url);

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