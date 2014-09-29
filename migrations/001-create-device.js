var Device = require('../models/device');

exports.id = 'create-initial-device';

exports.up = function(done) {

  var device = {
    name: "Initial Device",
    uid: "12345",
    registered: true,
    description: "This is the initial device for the web console.  Please create a new device with a more secure unique id and delete this device."
  };

  Device.createDevice(device, done);
};

exports.down = function(done) {
  Device.getDeviceByUid("12345", function(err, device) {
    if (err || !device ) return done(err);

    Device.deleteDevice(device, done);
  });
};
