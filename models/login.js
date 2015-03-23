var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var LoginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device' }
},{
  versionKey: false
});

var transform = function(login, ret, options) {
  if ('function' != typeof user.ownerDocument) {
    ret.timestamp = _id.getTimestamp();
    delete ret._id;
  }
}

LoginSchema.set("toJSON", {
  transform: transform
});

exports.transform = transform;

// Creates the Model for the User Schema
var Login = mongoose.model('Login', LoginSchema);

exports.getLoginsForUser = function(user, options, callback) {
  var conditions = {
    userId: user._id
  };

  // TODO sort newest to oldest

  // TODO set limit

  Login.find(conditions, function (err, logins) {
    if (err) return callback(err);

    callback(err, logins);
  });
}

exports.createLogin = function(user, device, callback) {
  var create = {
    userId: user._id,
    deviceId: device._id
  }

  Login.create(create, function(err, login) {
    if (err) return callback(err);

    callback(null, login);
  });
}

exports.removeLoginsForUser = function(user, callback) {
  Login.remove({userId: user._id}, function(err) {
    callback(err);
  });
}
