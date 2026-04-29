const mongoose = require('mongoose');

const IconSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  formId: { type: Number, required: false },
  primary: { type: String, required: false },
  variant: { type: Object, required: false },
  relativePath: { type: String, required: true }
}, {
  versionKey: false
});

const Icon = mongoose.model('Icon', IconSchema);
exports.Model = Icon;

exports.getAll = function (options, callback) {
  var conditions = {};
  if (options.eventId) conditions.eventId = options.eventId;
  if (options.formId) conditions.formId = options.formId;

  Icon.find(conditions).then(
    icons => callback(null, icons),
    err => callback(err)
  );
};

exports.getIcon = function (options, callback) {
  var primary = options.primary;
  var variant = options.variant;

  var condition = {
    eventId: options.eventId,
    formId: options.formId,
    primary: { "$in": [primary, null] }
  };

  if (isNaN(variant)) {
    condition.variant = { "$in": [variant, null] };
  } else {
    condition["$or"] = [{ variant: { "$lte": variant } }, { variant: null }];
  }

  Icon.findOne(condition, {}, { sort: { primary: -1, variant: -1 } }).then(
    icon => callback(null, icon),
    err => callback(err)
  );
};

exports.create = function (icon, callback) {
  var conditions = {
    eventId: icon.eventId,
    formId: icon.formId,
    primary: icon.primary,
    variant: icon.variant
  };
  Icon.findOneAndUpdate(conditions, icon, { upsert: true, new: false }).then(
    oldIcon => callback(null, oldIcon),
    err => callback(err)
  );
};

exports.remove = function (options, callback) {
  var condition = {
    eventId: options.eventId,
    formId: options.formId
  };

  if (options.primary) condition.primary = options.primary;
  if (options.variant) condition.variant = options.variant;

  Icon.deleteMany(condition).then(
    () => callback(null),
    err => callback(err)
  );
};
