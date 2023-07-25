"use strict";

const mongoose = require('mongoose');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const SettingSchema = new Schema({
  type: { type: String, required: true, unique: true },
  settings: Schema.Types.Mixed
}, {
  versionKey: false
});

function transform(setting, ret) {
  if ('function' !== typeof setting.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
  }
}

SettingSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the Setting Schema
const Setting = mongoose.model('Setting', SettingSchema);

exports.getSettings = function () {
  return Setting.find({}).exec();
};

exports.getSetting = function (type) {
  return Setting.findOne({ type: type }).exec();
};

exports.updateSettingByType = function (type, update) {
  return Setting.findOneAndUpdate({ type: type }, update, { new: true, upsert: true }).exec();
};
