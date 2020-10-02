const mongoose = require('mongoose')
  , async = require("async")
  , hasher = require('../utilities/pbkdf2')()
  , User = require('./user')
  , Token = require('./token')
  , Setting = require('./setting')
  , PasswordValidator = require('../utilities/passwordValidator');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const AuthenticationSchema = new Schema({
  type: { type: String, required: false },
  password: { type: String, required: true },
  previousPasswords: { type: [String], required: false },
  security: {
    locked: { type: Boolean },
    lockedUntil: { type: Date },
    invalidLoginAttempts: { type: Number, default: 0 },
    numberOfTimesLocked: { type: Number, default: 0 }
  }
},{
  versionKey: false,
  timestamps: {
    updatedAt: 'lastUpdated'
  }
});

AuthenticationSchema.method('validatePassword', function (password, callback) {
  var authentication = this;
  if (authentication.type !== 'local') return callback(null, false);

  hasher.validPassword(password, authentication.password, callback);
});

// Encrypt password before save
AuthenticationSchema.pre('save', function (next) {
  const authentication = this;

  // only hash the password if it has been modified (or is new)
  if (authentication.type !== 'local' || !authentication.isModified('password')) {
    return next();
  }

  async.waterfall([
    function(done) {
      Setting.getSetting('security').then(security => {
        done(null, security.settings.local.passwordPolicy);
      }).catch(err => done(err));
    },
    function(policy, done) {
      const { password, previousPasswords } = authentication;
      PasswordValidator.validate(policy, { password, previousPasswords }).then(validationStatus => {
        if (!validationStatus.valid) {
          const err = new Error(validationStatus.errorMsg);
          err.status = 400;
          return done(err);
        }

        done(null, policy);
      });
    },
    function(policy, done) {
      hasher.hashPassword(authentication.password, function(err, password) {
        done(err, policy, password);
      });
    }
  ], function (err, policy, password) {
    if (err) return next(err);

    authentication.password = password;
    authentication.previousPasswords.unshift(password);
    authentication.previousPasswords = authentication.previousPasswords.slice(0, policy.passwordHistoryCount);
    next();
  });
});

// Remove Token if password changed
AuthenticationSchema.pre('save', function (next) {
  const authentication = this;

  // only remove token if password has been modified (or is new)
  if (!authentication.isModified('password')) {
    return next();
  }

  async.waterfall([
    function (done) {
      User.getUserByAuthenticationId(authentication._id).then(user => {
        done(null, user);
      }).catch(err => {
        done(err);
      });
    },
    function (user, done) {
      if (user) {
        Token.removeTokensForUser(user, function (err) {
          if (err) return done(err);

          done();
        });
      } else {
        done();
      }
    }
  ], function (err) {
    return next(err);
  });

});

const Authentication = mongoose.model('Authentication', AuthenticationSchema);
exports.Model = Authentication;

exports.getAuthenticationById = function (id) {
  return Authentication.findById(id).exec();
};

exports.createAuthentication = function (authentication) {
  const newAuth = new Authentication({
    type: authentication.type,
    password: authentication.password,
    previousPasswords: [],
    security: {
      locked: false,
      lockedUntil: null
    }
  });
  
  return newAuth.save();
};

exports.updateAuthentication = function (authentication) {
  return authentication.save();
};

exports.removeAuthenticationById = function (authenticationId, done) {
  Authentication.findByIdAndRemove(authenticationId, done);
};