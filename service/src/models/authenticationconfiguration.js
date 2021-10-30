"use strict";

const mongoose = require('mongoose');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const AuthenticationConfigurationSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: false },
  textColor: { type: String, required: false },
  buttonColor: { type: String, required: false },
  icon: { type: Buffer, required: false },
  enabled: { type: Boolean, default: true },
  settings: Schema.Types.Mixed
}, {
  timestamps: {
    updatedAt: 'lastUpdated'
  },
  versionKey: false
});

AuthenticationConfigurationSchema.index({ name: 1, type: 1 }, { unique: true });

const whitelist = ['name', 'type', 'title', 'textColor', 'buttonColor', 'icon'];
const blacklist = ['clientsecret', 'bindcredentials', 'privatecert', 'decryptionpvk'];
const secureMask = '*****';

const transform = function (config, ret, options) {
  if ('function' !== typeof config.ownerDocument) {
    delete ret.__v;

    if (options.whitelist) {
      if (config.type === 'local') {
        return;
      }

      Object.keys(ret).forEach(key => {
        if (!whitelist.includes(key)) {
          delete ret[key];
        }
      });
    }

    if (options.blacklist) {
      Object.keys(ret.settings).forEach(key => {
        if (blacklist.includes(key.toLowerCase())) {
          ret.settings[key] = secureMask;
        }
      });
    }

    ret.icon = ret.icon ? ret.icon.toString('base64') : null;
  }
};

AuthenticationConfigurationSchema.set("toObject", {
  transform: transform
});

exports.transform = transform;

exports.secureMask = secureMask;
exports.blacklist = blacklist;

const AuthenticationConfiguration = mongoose.model('AuthenticationConfiguration', AuthenticationConfigurationSchema);
exports.Model = AuthenticationConfiguration;

exports.getById = function (id) {
  return AuthenticationConfiguration.findById(id).exec();
};

exports.getConfiguration = function (type, name) {
  return AuthenticationConfiguration.findOne({ type: type, name: name }).exec();
};

exports.getConfigurationsByType = function (type) {
  return AuthenticationConfiguration.find({ type: type }).exec();
};

exports.getAllConfigurations = function () {
  return AuthenticationConfiguration.find({}).exec();
};

function manageIcon(config) {
  if (config.icon) {
    if (config.icon.startsWith('data')) {
      config.icon = Buffer.from(config.icon.split(",")[1], "base64");
    } else {
      config.icon = Buffer.from(config.icon, 'base64');
    }
  } else {
    config.icon = null;
  }
}

function manageSettings(config) {
  if (config.settings.scope) {
    if (!Array.isArray(config.settings.scope)) {
      config.settings.scope = config.settings.scope.split(',');
    }

    for (let i = 0; i < config.settings.scope.length; i++) {
      config.settings.scope[i] = config.settings.scope[i].trim();
    }
  }
}

//TODO move the 'manage' methods to a pre save method

exports.create = function (config) {
  manageIcon(config);
  manageSettings(config);

  return AuthenticationConfiguration.create(config);
};

exports.update = function (id, config) {
  manageIcon(config);
  manageSettings(config);

  return AuthenticationConfiguration.findByIdAndUpdate(id, config, { new: true }).exec();
};

exports.remove = function (id) {
  return AuthenticationConfiguration.findByIdAndRemove(id).exec();
};