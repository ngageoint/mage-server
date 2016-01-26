var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var SettingSchema = new Schema({
  type: { type: String, required: true, unique: true },
  settings: Schema.Types.Mixed
},{
  versionKey: false
});

function transform(setting, ret) {
  if ('function' != typeof setting.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
  }
}

SettingSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the Setting Schema
var Setting = mongoose.model('Setting', SettingSchema);

exports.getSettings = function(callback) {
  Setting.find({}, function(err, settings) {
    callback(err, settings);
  });
};

exports.getSetting = function(type, callback) {
  Setting.findOne({type: type}, function(err, setting) {
    callback(err, setting);
  });
};

exports.getSettingByType = function(type, callback) {
  Setting.findOne({type: type}, function(err, setting) {
    callback(err, setting);
  });
};

exports.updateSettingByType = function(type, update, callback) {
  Setting.findOneAndUpdate({type: type}, update, {new: true, upsert: true}, function(err, setting) {
    callback(err, setting);
  });
};
