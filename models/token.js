var crypto = require('crypto')
  , mongoose = require('mongoose')
  , environment = require('../environment/env');

// Token expiration in msecs
var tokenExpiration = environment.tokenExpiration * 1000;

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold users
var TokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
  expirationDate: { type: Date, required: true },
  token: { type: String, required: true }
},{
  versionKey: false
});

TokenSchema.index({'expirationDate': 1}, {expireAfterSeconds: 0});

// Creates the Model for the User Schema
var Token = mongoose.model('Token', TokenSchema);

exports.getToken = function(token, callback) {
  Token.findOne({token: token}).populate({
    path: 'userId',
    populate: {
      path: 'authenticationId',
      model: 'Authentication'
    }
  }).exec(function(err, token) {    
    if (err) return callback(err);

    if (!token || !token.userId) {
      return callback(null, null);
    }

    token.userId.populate('roleId', function(err, user) {
      return callback(err, {user: user, deviceId: token.deviceId, token: token});
    });
  });
};

exports.createToken = function(options, callback) {
  var seed = crypto.randomBytes(20);
  var token = crypto.createHash('sha1').update(seed).digest('hex');

  var query = {userId: options.userId};
  if (options.device) {
    query.deviceId = options.device._id;
  }

  var now = Date.now();
  var update = {
    token: token,
    expirationDate: new Date(now + tokenExpiration)
  };
  Token.findOneAndUpdate(query, update, {upsert: true, new: true}, function(err, newToken) {
    callback(err, newToken);
  });
};

exports.removeToken = function(token, callback) {
  Token.findByIdAndRemove(token._id, function(err) {
    callback(err);
  });
};

exports.removeTokensForUser = function(user, callback) {
  Token.remove({userId: user._id}, function(err, numberRemoved) {
    callback(err, numberRemoved);
  });
};

exports.removeTokenForDevice = function(device, callback) {
  Token.remove({deviceId: device._id}, function(err, numberRemoved) {
    callback(err, numberRemoved);
  });
};
