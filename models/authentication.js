"use strict";

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
  type: { type: String, required: true },
  title: { type: String, required: false },
  textColor: { type: String, required: false },
  buttonColor: { type: String, required: false },
  icon: { type: String, required: false },
  enabled: { type: Boolean, default: false }
}, {
  discriminatorKey: 'type',
  timestamps: {
    updatedAt: 'lastUpdated'
  }
});

const LocalSchema = new Schema({
  id: { type: String, required: false },
  password: { type: String, required: true },
  previousPasswords: { type: [String], required: false },
  security: {
    locked: { type: Boolean, default: false },
    lockedUntil: { type: Date },
    invalidLoginAttempts: { type: Number, default: 0 },
    numberOfTimesLocked: { type: Number, default: 0 }
  }
});

const SamlSchema = new Schema({
  uidAttribute: { type: String },
  displayNameAttribute: { type: String },
  emailAttribute: { type: String },
  options: {
    issuer: { type: String },
    entryPoint: { type: String },
    callbackPath: { type: String }
  }
});

const LdapSchema = new Schema({
  url: { type: String },
  baseDN: { type: String },
  username: { type: String },
  password: { type: String },
  ldapUsernameField: { type: String },
  ldapDisplayNameField: { type: String },
  ldapEmailField: { type: String }
});

const OauthSchema = new Schema({
  callbackURL: { type: String },
  clientID: { type: String },
  clientSecret: { type: String },
  //geoaxis
  authorizationUrl: { type: String },
  apiUrl: { type: String },
  //login-gov
  loa: { type: String },
  url: { type: String },
  client_id: { type: String },
  acr_values: { type: String },
  redirect_uri: { type: String },
  keyFile: { type: String }
});

LocalSchema.method('validatePassword', function (password, callback) {
  const authentication = this;

  hasher.validPassword(password, authentication.password, callback);
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
      Setting.getSetting('security').then(security => {
        done(null, security.settings.local.passwordPolicy);
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

exports.getAuthenticationByStrategy = function (strategy, uid, callback) {
  Authentication.findOne({ id: uid, type: strategy }, callback);
};

exports.createAuthentication = function (authentication) {
  let newAuth;
  switch (authentication.type) {
    case "local": {
      newAuth = new LocalAuthentication({
        id: authentication.id,
        password: authentication.password,
        previousPasswords: [],
        security: {
          locked: false,
          lockedUntil: null
        }
      });
      break;
    }
    case "saml": {
      newAuth = new SamlAuthentication({
        uidAttribute: authentication.uidAttribute,
        displayNameAttribute: authentication.displayNameAttribute,
        emailAttribute: authentication.emailAttribute,
        options: {
          issuer: authentication.options.issuer,
          entryPoint: authentication.options.entryPoint,
          callbackPath: authentication.options.callbackPath
        }
      });
      break;
    }
    case "ldap": {
      newAuth = new LdapAuthentication({
        url: authentication.url,
        baseDN: authentication.baseDN,
        username: authentication.username,
        password: authentication.password,
        ldapUsernameField: authentication.ldapUsernameField,
        ldapDisplayNameField: authentication.ldapDisplayNameField,
        ldapEmailField: authentication.ldapEmailField
      });
      break;
    }
    case "oauth": {
      newAuth = new OauthAuthentication({
        callbackURL: authentication.callbackURL,
        clientID: authentication.clientID,
        clientSecret: authentication.clientSecret,
        //geoaxis
        authorizationUrl: authentication.authorizationUrl,
        apiUrl: authentication.apiUrl,
        //login-gov
        loa: authentication.loa,
        url: authentication.url,
        client_id: authentication.client_id,
        acr_values: authentication.acr_values,
        redirect_uri: authentication.redirect_uri,
        keyFile: authentication.keyFile
      });
      break;
    }
  }

  //Set base authentication attributes
  if (newAuth) {
    newAuth.type = authentication.type;
    newAuth.title = authentication.title;
    newAuth.textColor = authentication.textColor;
    newAuth.buttonColor = authentication.buttonColor;
    newAuth.icon = authentication.icon;
    newAuth.enabled = authentication.enabled;
  }

  return newAuth.save();
};

exports.updateAuthentication = function (authentication) {
  return authentication.save();
};

exports.removeAuthenticationById = function (authenticationId, done) {
  Authentication.findByIdAndRemove(authenticationId, done);
};