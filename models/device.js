var mongoose = require('mongoose')
  , async = require('async')
  , Feature = require('./feature')
  , User = require('./user')
  , Token = require('./token');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema; 

// Collection to hold users
// TODO cascade delete from poc when user is deleted.
var DeviceSchema = new Schema({
    uid: { type: String, required: true, unique: true },
    name: { type: String, required: false },
    description: { type: String, required: false },
    registered: { type: Boolean, required: true },
    poc: Schema.Types.ObjectId,
  },{ 
    versionKey: false
  }
);

//Validate that uid is non-null and unique
DeviceSchema.pre('save', function(next) {
  var device = this;

  if (!device.uid) {
    return next(new Error("uid cannot be null"));
  }

  // only validate uid if it has been modified (or is new)
  if (!device.isModified('uid')) return next();

  Device.findOne({uid: device.uid}, function(err, device) {
    if (err) return next(err);

    if (device) return next(new Error("uid already exists"));

    next();
  });
});

// Validate that poc is unique
DeviceSchema.pre('save', function(next) {
  var device = this;

  // only validate poc if it has been modified (or is new)
  if (!device.poc || !device.isModified('poc')) return next();

  User.getUserById(device.poc, function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next(new Error('invlaid POC user, user does not exist'));
    }

    next();
  });
});

DeviceSchema.pre('remove', function(next) {
  var device = this;

  async.parallel({
    token: function(done) {
      Token.removeTokenForDevice(device, function(err) {
        done(err);
      });
    },
    feature: function(done) {
      Feature.removeDevice(device, function(err) {
        done(err);
      });
    }
  },
  function(err, results) {
    next(err);
  });
});

// Creates the Model for the User Schema
var Device = mongoose.model('Device', DeviceSchema);
exports.Model = Device;

exports.getDeviceById = function(id, callback) {
  Device.findById(id, function(err, device) {
    if (err) {
      console.log('Error finding device for id: ' + id + ' err: ' + err);
    }

    callback(err, device);
  });
}

exports.getDeviceByUid = function(uid, callback) {
  var conditions = {uid: uid};
  Device.findOne(conditions, function(err, device) {
    if (err) {
      console.log('Error finding device for id: ' + id + ' err: ' + err);
    }

    callback(err, device);
  });
}

exports.getDevices = function(callback) {
  var query = {};
  Device.find(query, function (err, devices) {
    if (err) {
      console.log("Error finding devices in mongo: " + err);
    }

    callback(err, devices);
  });
}

exports.createDevice = function(device, callback) {
  var create = {
    uid: device.uid,
    name: device.name,
    description: device.description,
    registered: device.registered,
    poc: device.poc
  }

  if (device.registered) create.registered = device.registered;

  Device.create(create, function(err, newDevice) {
    if (err) {
      console.log('Error creating device: ' + JSON.stringify(create) + " err: " + err);
    }

    callback(err, newDevice);
  });
}

exports.updateDevice = function(id, update, callback) {
  console.log('update device: ' + JSON.stringify(update));
  Device.findByIdAndUpdate(id, update, function(err, updatedDevice) {
    if (err) {
      console.log('Could not update device ' + id + ' err: ' + err);
    }

    callback(err, updatedDevice);
  });
}

exports.deleteDevice = function(id, callback) {
  Device.findById(id, function(err, device) {
    if (!device) {
      var msg = "Device with id '" + id + "' not found and could not be deleted.";
      console.log(msg + " Error: " + err);
      return callback(new Error(msg));
    }

    device.remove(function(err, removedDevice) {
      if (err) {
        console.log("Error removing device", err);
      }

      callback(err, removedDevice);
    });
  });
}