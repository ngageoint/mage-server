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

    if (device.populated('userId')) {
      ret.user = ret.userId;
      delete ret.userId;
    }
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
    callback(err, device);
  });
}

exports.getDeviceByUid = function(uid, callback) {
  var conditions = {uid: uid.toLowerCase()};
  Device.findOne(conditions, function(err, device) {
    callback(err, device);
  });
}

exports.getDevices = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};

  var filter = options.filter || {};
  if (filter.registered === true) {
    conditions.registered = true;
  }

  if (filter.registered === false) {
    conditions.registered = false;
  }

  Device.find(conditions, function (err, devices) {
    var expand = options.expand || {};
    if (expand.user === true) {
      Device.populate(devices, 'userId', callback);
    } else {
      callback(err, devices);
    }
  });
}

exports.count = function(callback) {
  Device.count({}, function(err, count) {
    callback(err, count);
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
      return callback(new Error(msg));
    }

    device.remove(function(err, removedDevice) {
      callback(err, removedDevice);
    });
  });
}
