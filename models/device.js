var mongoose = require('mongoose')
  , async = require('async')
  , Observation = require('./observation')
  , User = require('./user')
  , Token = require('./token')
  , Setting = require('../models/setting')
  , log = require('winston');

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

DeviceSchema.pre('findOneAndUpdate', function(next) {
  if (this.getUpdate().registered === false) {
    Token.removeTokenForDevice({_id: this.getQuery()._id}, function(err) {
      next(err);
    });
  } else {
    next();
  }
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

exports.getDeviceById = function(id, options) {
  options = options || {};

  const query = Device.findById(id);

  if (options.expand && options.expand.user) {
    query.populate('userId');
  }

  return query.exec();
};

exports.getDeviceByUid = function(uid, { expand = {} } = {}) {
  const query = Device.findOne({ uid: uid.toLowerCase() });

  if (expand.user) {
    query.populate('userId');
  }

  return query.exec();
};

exports.getDevices = function({expand = {}, filter = {}} = {}) {
  var condition = {};

  if (filter.registered === true) {
    condition.registered = true;
  }

  if (filter.registered === false) {
    condition.registered = false;
  }

  const query = Device.find(condition);

  if (expand.user) {
    query.populate('userId');
  }

  return query.exec();
};

exports.count = function() {
  return Device.count({}).exec();
};

exports.createDevice = async function(device) {
  // TODO there is a ticket in mongooose that is currently open
  // to add support for running setters on findOneAndUpdate
  // once that happens there is no need to do this
  device.uid = device.uid.toLowerCase();

  var update = {
    name: device.name,
    description: device.description,
    userId: device.userId,
    userAgent: device.userAgent,
    appVersion: device.appVersion
  };

  if (device.registered) { 
    update.registered = device.registered;
  } else {
    log.info("Reading security settings");
    const securitySettings = await Setting.getSetting('security');
    if(securitySettings && securitySettings.settings) {
      let autoRegisterDevice = securitySettings.settings.autoRegisterDevice;
      if (autoRegisterDevice) {
        log.info("Auto-Register Devices is " + autoRegisterDevice.enabled);
        update.registered = autoRegisterDevice.enabled;
      }
    }
  }
  log.info("Creating new device ", device.uid);
  return await Device.findOneAndUpdate({uid: device.uid}, update, {new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true}).exec();
};

exports.updateDevice = function(id, update) {
  // TODO there is a ticket in mongooose that is currently open
  // to add support for running setters on findOneAndUpdate
  // once that happens there is no need to do this
  if (update.uid) update.uid = update.uid.toLowerCase();

  return Device.findByIdAndUpdate(id, update, {new: true, setDefaultsOnInsert: true, runValidators: true}).exec();
};

exports.deleteDevice = function(id) {
  return Device.findById(id).exec()
    .then(device => {
      return device ? device.remove() : Promise.resolve(device);
    });
};
