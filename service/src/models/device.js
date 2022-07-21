'use strict';

const mongoose = require('mongoose')
  , async = require('async')
  , Observation = require('./observation')
  , User = require('./user')
  , Token = require('./token')
  , log = require('winston')
  , { countAndPage, page } = require('../utilities/paging')
  , FilterParser = require('../utilities/filterParser');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

// Collection to hold users
// TODO cascade delete from userId when user is deleted.
const DeviceSchema = new Schema({
  uid: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: false },
  registered: { type: Boolean, required: true, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userAgent: { type: String, required: false },
  appVersion: { type: String, required: false }
}, {
  versionKey: false
});

DeviceSchema.path('userId').validate(async function (userId) {
  let isValid = true;

  try {
    const user = await User.getUserById(userId);
    if(!user) {
      isValid = false;
    } 
  } catch(err) {
    isValid = false;
  }
 
  return isValid;
}, 'Invalid POC user, user does not exist');

DeviceSchema.pre('findOneAndUpdate', function (next) {
  if (this.getUpdate() && this.getUpdate().registered === false) {
    Token.removeTokenForDevice({ _id: this.getQuery()._id }, function (err) {
      next(err);
    });
  } else {
    next();
  }
});

DeviceSchema.pre('findOneAndDelete', function (next) {
  //Get a reference of "this" that can be used in async, since "this" changes in async
  const query = this;

  async.parallel({
    token: function (done) {
      Token.removeTokenForDevice({ _id: query.getQuery()._id }, function (err) {
        done(err);
      });
    },
    observation: function (done) {
      Observation.removeDevice({ _id: query.getQuery()._id }, function (err) {
        done(err);
      });
    }
  },
    function (err) {
      next(err);
    });
});

function transform(device, ret) {
  if (device.parent() == device) {
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

const Device = mongoose.model('Device', DeviceSchema);
exports.Model = Device;

exports.getDeviceById = function (id, options) {
  options = options || {};

  const query = Device.findById(id);

  if (options.expand && options.expand.user) {
    query.populate('userId');
  }

  return query.exec();
};

exports.getDeviceByUid = function (uid, { expand = {} } = {}) {
  const query = Device.findOne({ uid: uid });

  if (expand.user) {
    query.populate('userId');
  }

  return query.exec();
};

exports.getDevices = function (options = {}) {
  const {filter = {}, expand = {}} = options;

  const conditions = createQueryConditions(filter);

  let query = Device.find(conditions);

  if(options.lean) {
    query = query.lean();
  }

  let isUserQuery = false;
  if (expand.user) {
    if (filter.user) {
      query = null;
      isUserQuery = true;
    } else {
      query.populate('userId');
    }
  } else {
    // TODO is this minimum enough??
    query.populate({
      path: 'userId',
      select: 'displayName'
    });
  }

  const isPaging = options.limit != null && options.limit > 0;
  if (isPaging) {
    let countQuery =  null;
    if (!isUserQuery) {
      countQuery = Device.find(conditions);
    }
    return pageDevices(countQuery, query, options, conditions);
  } else {
    return query.exec();
  }
};

exports.count = function (options) {
  options = options || {};
  var filter = options.filter || {};

  var conditions = createQueryConditions(filter);

  return Device.count(conditions).exec();
};

function createQueryConditions(filter) {
  const conditions = FilterParser.parse(filter);

  if (filter.registered) {
    conditions.registered = filter.registered == 'true';
  }

  return conditions;
};

function pageDevices(countQuery, query, options, conditions) {
  if (countQuery == null) {
    return queryUsersAndDevicesThenPage(options, conditions);
  }
  return countAndPage(countQuery, query, options, 'devices');
}

async function queryUsersAndDevicesThenPage(options, conditions) {
  let registered = null;
  if (conditions.registered != null) {
    registered = conditions.registered;
    delete conditions.registered;
  }
  const count = await User.Model.count(conditions);
  return User.Model.find(conditions, "_id").populate({ path: 'authenticationId', populate: { path: 'authenticationConfigurationId' } }).exec().then(data => {
    const ids = [];
    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      ids.push(user.id);
    }
    const deviceOptions = {
      filter: {
        in: {
          userId: ids
        }
      }
    };

    delete options.sort;

    const deviceConditions = FilterParser.parse(deviceOptions.filter);
    if (registered != null) {
      deviceConditions.registered = registered;
    }
    const deviceQuery = Device.find(deviceConditions);
    deviceQuery.populate('userId');
    return page(count, deviceQuery, options, 'devices');
  });
}

exports.createDevice = function (device) {
  const update = {
    name: device.name,
    description: device.description,
    registered: device.registered,
    userId: device.userId,
    userAgent: device.userAgent,
    appVersion: device.appVersion
  };

  log.info(`creating new device ${device.uid} for user ${device.userId}`);
  const options = { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true };
  return Device.findOneAndUpdate({ uid: device.uid }, update, options).exec();
};

exports.updateDevice = function (id, update) {
  const options =  { new: true, setDefaultsOnInsert: true, runValidators: true };
  return Device.findOneAndUpdate({ _id: id }, update, options).exec();
};

exports.deleteDevice = function (id) {
  return Device.findOneAndDelete({_id: id}).exec();
};