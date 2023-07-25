var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var LoginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device' }
},{
  versionKey: false
});

LoginSchema.index({userId: 1});
LoginSchema.index({deviceId: 1});
LoginSchema.index({userId: 1, deviceId: 1});
LoginSchema.index({_id: 1, userId: 1, deviceId: 1});

function transform(login, ret) {
  if ('function' !== typeof login.ownerDocument) {
    ret.id = ret._id;
    ret.timestamp = ret._id.getTimestamp();
    delete ret._id;

    if (login.populated('userId')) {
      ret.user = ret.userId;
      delete ret.userId;
    }

    if (login.populated('deviceId')) {
      ret.device = ret.deviceId;
      delete ret.deviceId;
    }
  }
}

LoginSchema.set("toJSON", {
  transform: transform
});

function objectIdForDate(date) {
  return mongoose.Types.ObjectId(Math.floor(date/1000).toString(16) + "0000000000000000");
}

// Creates the Model for the User Schema
var Login = mongoose.model('Login', LoginSchema);

exports.getLogins = function(options, callback) {
  var conditions = {};
  var filter = options.filter || {};

  if (filter.userId) {
    conditions.userId = filter.userId;
  }

  if (filter.deviceId) {
    conditions.deviceId = filter.deviceId;
  }

  if (filter.startDate) {
    conditions._id = {$gte: objectIdForDate(filter.startDate)};
  }
  if (filter.endDate) {
    conditions._id = conditions._id || {};
    conditions._id.$lte = objectIdForDate(filter.endDate);
  }

  if (options.lastLoginId) {
    conditions._id = conditions._id || {};
    conditions._id.$lt = mongoose.Types.ObjectId(options.lastLoginId);
  }

  if (options.firstLoginId) {
    conditions._id = conditions._id || {};
    conditions._id.$gt = mongoose.Types.ObjectId(options.firstLoginId);
  }

  var o = {
    limit: options.limit || 10,
    sort: {
      _id: options.firstLoginId ? 1 : -1
    }
  };

  Login.find(conditions, null, o).populate([{path: 'userId'}, {path: 'deviceId'}]).exec(function (err, logins) {
    callback(err, options.firstLoginId ? logins.reverse() : logins);
  });
};

exports.createLogin = function(user, device, callback) {
  const create = {
    userId: user._id
  }

  if (device) {
    create.deviceId = device._id
  }

  Login.create(create, function(err, login) {
    if (err) return callback(err);

    callback(null, login);
  });
};

exports.removeLoginsForUser = function(user, callback) {
  Login.remove({userId: user._id}, function(err) {
    callback(err);
  });
};
