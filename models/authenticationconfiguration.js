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
  discriminatorKey: 'type',
  timestamps: {
    updatedAt: 'lastUpdated'
  },
  versionKey: false
});

const whitelist = ['url', 'name', 'type', 'title', 'textColor', 'buttonColor', 'icon'];

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

    ret.icon = ret.icon ? ret.icon.toString('base64') : null;
  }
};

AuthenticationConfigurationSchema.set("toObject", {
  transform: transform
});

exports.transform = transform;

const AuthenticationConfiguration = mongoose.model('AuthenticationConfiguration', AuthenticationConfigurationSchema);
exports.Model = AuthenticationConfiguration;

exports.getById = function (id) {
  return AuthenticationConfiguration.findById(id).exec();
};

exports.getConfiguration = function (type, name) {
  if (name === undefined) {
    return AuthenticationConfiguration.findOne({ type: type }).exec();
  }
  return AuthenticationConfiguration.findOne({ type: type, name: name }).exec();
};

exports.getConfigurationsByType = function (type) {
  return AuthenticationConfiguration.find({ type: type }).exec();
};

exports.getAllConfigurations = function () {
  return AuthenticationConfiguration.find({}).exec();
};

exports.create = function (config)  {
  if (config.icon.startsWith('data')) {
    config.icon = new Buffer(config.icon.split(",")[1], "base64");
  } else {
    config.icon = new Buffer(config.icon, 'base64');
  }
  return AuthenticationConfiguration.create(config);
};

exports.update = function (id, config) {
  return AuthenticationConfiguration.findByIdAndUpdate(id, config, { new: true }).exec();
};

exports.remove = function (id) {
  return AuthenticationConfiguration.findByIdAndRemove(id).exec();
};