import crypto from 'crypto'
import mongoose, { Schema } from 'mongoose'
import { UserModel, UserDocument } from '../adapters/users/adapters.users.db.mongoose'
import environment = require('../environment/env');

export interface TokenDocumentAttrs {
  token: string
  expirationDate: Date
  userId?: mongoose.Types.ObjectId | undefined
  deviceId?: mongoose.Types.ObjectId | undefined
}

export type TokenDocument = mongoose.Document<mongoose.Types.ObjectId, any, TokenDocumentAttrs> & TokenDocumentAttrs
export type TokenDocumentPopulated = TokenDocument & {
  userId: UserDocument
}

// Token expiration in msecs
const tokenExpiration = environment.tokenExpiration * 1000

// Collection to hold users
const TokenSchema = new Schema<TokenDocumentAttrs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    expirationDate: { type: Date, required: true },
    token: { type: String, required: true }
  },
  { versionKey: false }
)

// TODO: index token
TokenSchema.index({ token: 1 })
TokenSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

const Token = mongoose.model('Token', TokenSchema)

export type SessionExpanded = {
  token: TokenDocument,
  user: UserDocument,
  deviceId: mongoose.Types.ObjectId | null,
}

export async function lookupSession(token: string): Promise<SessionExpanded | null> {
  // TODO: try to eliminate these populate join queries here or elsewhere; something is doing redundant queries
  const tokenDoc = await Token.findOne({ token }).populate({
    path: 'userId',
    // populate: {
    //   path: 'authenticationId',
    //   model: 'Authentication'
    // }
  })
  if (!tokenDoc || !tokenDoc.userId) {
    return null
  }
  tokenDoc.userId.populate('roleId', function(err, user) {
    return callback(err, {user: user, deviceId: tokenDoc.deviceId, token: tokenDoc });
  });
}

exports.createToken = function(options, callback) {
  const seed = crypto.randomBytes(20);
  const token = crypto.createHash('sha256').update(seed).digest('hex');
  const query: any = { userId: options.userId };
  if (options.device) {
    query.deviceId = options.device._id;
  }
  const now = Date.now();
  const update = {
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
