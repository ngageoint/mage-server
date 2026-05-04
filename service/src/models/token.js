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
}, {
  versionKey: false
});

// TODO: index token
TokenSchema.index({ 'expirationDate': 1 }, { expireAfterSeconds: 0 });

// Creates the Model for the User Schema
var Token = mongoose.model('Token', TokenSchema);

exports.getToken = function (token, callback) {
  Token.findOne({ token: token }).populate({
    path: 'userId',
    populate: {
      path: 'authenticationId',
      model: 'Authentication'
    }
  }).exec().then(
    async function (token) {
      if (!token || !token.userId) {
        return callback(null, null);
      }

      try {
        const user = await token.userId.populate('roleId');
        return callback(null, { user: user, deviceId: token.deviceId, token: token });
      } catch (err) {
        return callback(err);
      }
    },
    function (err) {
      return callback(err);
    }
  );
};

exports.createToken = function (options, callback) {
  const seed = crypto.randomBytes(20);
  const token = crypto.createHash('sha256').update(seed).digest('hex');
  const query = { userId: options.userId };
  if (options.device) {
    query.deviceId = options.device._id;
  }
  const now = Date.now();
  const update = {
    token: token,
    expirationDate: new Date(now + tokenExpiration)
  };
  Token.findOneAndUpdate(query, update, { upsert: true, new: true }).then(
    newToken => callback(null, newToken),
    err => callback(err)
  );
};

exports.removeToken = function (token, callback) {
  Token.findByIdAndDelete(token._id).then(
    () => callback(null),
    err => callback(err)
  );
};

exports.removeTokensForUser = function (user, callback) {
  Token.deleteMany({ userId: user._id }).then(
    () => callback(null),
    err => callback(err)
  );
};

exports.removeTokenForDevice = function (device, callback) {
  Token.deleteMany({ deviceId: device._id }).then(
    () => callback(null),
    err => callback(err)
  );
};
