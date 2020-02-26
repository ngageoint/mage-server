var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var IconSchema = new Schema({
  eventId: { type: Number, required: true },
  formId: { type: Number, required: false },
  primary: { type: String, required: false },
  variant: { type: Object, required: false },
  relativePath: {type: String, required: true }
},{
  versionKey: false
});

// Creates the Model for the Layer Schema
var Icon = mongoose.model('Icon', IconSchema);
exports.Model = Icon;

exports.getAll = function(options, callback) {
  var conditions = {};
  if (options.eventId) conditions.eventId = options.eventId;
  if (options.formId) conditions.formId = options.formId;

  Icon.find(conditions, function(err, icons) {
    callback(err, icons);
  });
};

exports.getIcon = function(options, callback) {
  var primary = options.primary;
  var variant = options.variant;

  var condition = {
    eventId: options.eventId,
    formId: options.formId,
    primary: {"$in": [primary, null]}
  };

  if (isNaN(variant)) {
    condition.variant = {"$in": [variant, null]};
  } else {
    condition["$or"] = [{variant: {"$lte": variant}}, {variant: null}];
  }

  Icon.findOne(condition, {}, {sort: {primary: -1, variant: -1}}, function (err, icon) {
    callback(err, icon);
  });
};

exports.create = function(icon, callback) {
  var conditions = {
    eventId: icon.eventId,
    formId: icon.formId,
    primary: icon.primary,
    variant: icon.variant
  };
  Icon.findOneAndUpdate(conditions, icon, {upsert: true, new: false}, function(err, oldIcon) {
    callback(err, oldIcon);
  });
};

exports.remove = function(options, callback) {
  var condition = {
    eventId: options.eventId,
    formId: options.formId
  };

  if (options.primary) condition.primary = options.primary;
  if (options.variant) condition.variant = options.variant;

  Icon.remove(condition, function(err) {
    callback(err);
  });
};
