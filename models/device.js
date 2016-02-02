var mongoose = require('mongoose')
  , async = require('async')
  , Observation = require('./observation')
  , User = require('./user')
  , Token = require('./token');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

function toLowerCase(field) {
  return field.toLowerCase();
}

// Collection to hold users
// TODO cascade delete from userId when user is deleted.
var DeviceSchema = new Schema({
  uid: { type: String, required: true, unique: true, set: toLowerCase },
  description: { type: String, required: false },
  registered: { type: Boolean, required: true, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userAgent: { type: String, required: false },
  appVersion: { type: String, required: false }
},{
  versionKey: false
});

DeviceSchema.path('userId').validate(function(userId, done) {
  User.getUserById(userId, function(err, user) {
    if (err || !user)  {
      done(false);
    } else {
      done(true);
    }
  });
}, 'Invalid POC user, user does not exist');

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
  function(err) {
    next(err);
  });
});

function transform(device, ret) {
  if ('function' !== typeof device.ownerDocument) {
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
};

exports.getDeviceByUid = function(uid, callback) {
  var conditions = {uid: uid.toLowerCase()};
  Device.findOne(conditions, function(err, device) {
    callback(err, device);
  });
};

exports.getDevices = function(options, callback) {
  if (typeof options === 'function') {
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
};

exports.count = function(callback) {
  Device.count({}, function(err, count) {
    callback(err, count);
  });
};

exports.createDevice = function(device, callback) {
  // TODO there is a ticket in mongooose that is currently open
  // to add support for running setters on findOneAndUpdate
  // once that happens there is no need to do this
  device.uid = device.uid.toLowerCase();

  var update = {
    name: device.name,
    description: device.description,
    userId: device.userId
  };

  if (device.registered) update.registered = device.registered;

  Device.findOneAndUpdate({uid: device.uid}, update, {new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true}, function(err, newDevice) {
    callback(err, newDevice);
  });
};

exports.updateDevice = function(id, update, callback) {
  // TODO there is a ticket in mongooose that is currently open
  // to add support for running setters on findOneAndUpdate
  // once that happens there is no need to do this
  if (update.uid) update.uid = update.uid.toLowerCase();

  Device.findByIdAndUpdate(id, update, {new: true, setDefaultsOnInsert: true, runValidators: true}, function(err, updatedDevice) {
    callback(err, updatedDevice);
  });
};

exports.deleteDevice = function(id, callback) {
  Device.findById(id, function(err, device) {
    if (!device) return callback(null, null);

    device.remove(function(err, removedDevice) {
      callback(err, removedDevice);
    });
  });
};
