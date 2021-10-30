"use strict";

const mongoose = require('mongoose')
  , async = require("async")
  , hasher = require('../utilities/pbkdf2')()
  , User = require('./user')
  , Token = require('./token')
  , AuthenticationConfiguration = require('./authenticationconfiguration')
  , PasswordValidator = require('../utilities/passwordValidator');

const Schema = mongoose.Schema;

const AuthenticationSchema = new Schema({
  type: { type: String, required: true },
  id: { type: String, required: false },
  authenticationConfigurationId: { type: Schema.Types.ObjectId, ref: 'AuthenticationConfiguration', required: false }
}, {
  discriminatorKey: 'type',
  timestamps: {
    updatedAt: 'lastUpdated'
  }
});

const LocalSchema = new Schema({
  password: { type: String, required: true },
  previousPasswords: { type: [String], default: [] },
  security: {
    locked: { type: Boolean, default: false },
    lockedUntil: { type: Date },
    invalidLoginAttempts: { type: Number, default: 0 },
    numberOfTimesLocked: { type: Number, default: 0 }
  }
});

const SamlSchema = new Schema({});
const LdapSchema = new Schema({});
const OauthSchema = new Schema({});
const OpenIdConnectSchema = new Schema({});

AuthenticationSchema.method('validatePassword', function (password, callback) {
  hasher.validPassword(password, this.password, callback);
});

// Encrypt password before save
LocalSchema.pre('save', function (next) {
  const authentication = this;

  // only hash the password if it has been modified (or is new)
  if (!authentication.isModified('password')) {
    return next();
  }

  async.waterfall([
    function (done) {
      AuthenticationConfiguration.Model.findById(authentication.authenticationConfigurationId).then(localConfiguration => {
        done(null, localConfiguration.settings.passwordPolicy);
      }).catch(err => done(err));
    },
    function (policy, done) {
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
    function (policy, done) {
      hasher.hashPassword(authentication.password, function (err, password) {
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
LocalSchema.pre('save', function (next) {
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

AuthenticationSchema.virtual('authenticationConfiguration').get(function () {
  return this.populated('authenticationConfigurationId') ? this.authenticationConfigurationId : null;
});

const Authentication = mongoose.model('Authentication', AuthenticationSchema);
exports.Model = Authentication;

const LocalAuthentication = Authentication.discriminator('local', LocalSchema);
exports.Local = LocalAuthentication;

const SamlAuthentication = Authentication.discriminator('saml', SamlSchema);
exports.SAML = SamlAuthentication;

const LdapAuthentication = Authentication.discriminator('ldap', LdapSchema);
exports.LDAP = LdapAuthentication;

const OauthAuthentication = Authentication.discriminator('oauth', OauthSchema);
exports.Oauth = OauthAuthentication;

const OpenIdConnectAuthentication = Authentication.discriminator('openidconnect', OpenIdConnectSchema);
exports.OpenIdConnect = OpenIdConnectAuthentication;

exports.getAuthenticationByStrategy = function (strategy, uid, callback) {
  if (callback) {
    Authentication.findOne({ id: uid, type: strategy }, callback);
  } else {
    return Authentication.findOne({ id: uid, type: strategy });
  }
};

exports.getAuthenticationsByType = function (type) {
  return Authentication.find({ type: type }).exec();
};

exports.getAuthenticationsByAuthConfigId = function (authConfigId) {
  return Authentication.find({ authenticationConfigurationId: authConfigId }).exec();
};

exports.countAuthenticationsByAuthConfigId = function (authConfigId) {
  return Authentication.count({ authenticationConfigurationId: authConfigId }).exec();
};

exports.createAuthentication = function (authentication) {
  const document = {
    id: authentication.id,
    type: authentication.type,
    authenticationConfigurationId: authentication.authenticationConfigurationId,
  }

  if (authentication.type === 'local') {
    document.password = authentication.password;
    document.security ={
      lockedUntil: null
    }
  }

  return Authentication.create(document);
};

exports.updateAuthentication = function (authentication) {
  return authentication.save();
};

exports.removeAuthenticationById = function (authenticationId, done) {
  Authentication.findByIdAndRemove(authenticationId, done);
};