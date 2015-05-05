var mongoose = require('mongoose')
  , async = require('async')
  , Observation = require('./observation')
  , User = require('./user')
  , Token = require('./token');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold users
// TODO cascade delete from userId when user is deleted.
var DeviceSchema = new Schema({
    uid: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    registered: { type: Boolean, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userAgent: { type: String, required: false },
    appVersion: { type: String, required: false }
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

  device.uid = device.uid.toLowerCase();
  Device.findOne({uid: device.uid}, function(err, device) {
    if (err) return next(err);

    if (device) return next(new Error("uid already exists"));

    next();
  });
});

// Validate that userId is unique
DeviceSchema.pre('save', function(next) {
  var device = this;

  // only validate userId if it has been modified (or is new)
  if (!device.userId || !device.isModified('userId')) return next();

  User.getUserById(device.userId, function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next(new Error('invlaid POC user, userId does not exist'));
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
    observation: function(done) {
      Observation.removeDevice(device, function(err) {
        done(err);
      });
    }
  },
  function(err, results) {
    next(err);
  });
});

var transform = function(device, ret, options) {
  if ('function' != typeof device.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
  }
}

DeviceSchema.set("toJSON", {
  transform: transform
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
  var conditions = {uid: uid.toLowerCase()};
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
    userId: device.userId
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
  Device.findByIdAndUpdate(id, update, {new: true}, function(err, updatedDevice) {
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
