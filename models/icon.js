var mongoose = require('mongoose')
  , path = require('path')
  , url = require('url');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var IconSchema = new Schema({
  formId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: false },
  variant: { type: Object, required: false },
  relativePath: {type: String, required: true }
},{
  versionKey: false
});

// Creates the Model for the Layer Schema
var Icon = mongoose.model('Icon', IconSchema);
exports.Model = Icon;

exports.getIcon = function(options, callback) {
  var type = options.type;
  var variant = options.variant;

  var condition = {
    formId: options.formId,
    type: {"$in": [type, null]},
  };

  if (isNaN(variant)) {
    condition.variant = {"$in": [variant, null]};
  } else {
    condition.variant = {"$lte": variant};
  }

  Icon.findOne(condition, {}, {sort: {type: -1, variant: -1}}, function (err, icon) {
    if (err) {
      console.log("Error finding icon in mongo: " + err);
    }

    callback(err, icon);
  });
}

exports.create = function(icon, callback) {
  var conditions = {
    formId: icon.formId,
    type: icon.type,
    variant: icon.variant
  };
  Icon.findOneAndUpdate(conditions, icon, {upsert: true, new: false}, function(err, oldIcon) {
    if (err) {
      console.log("Problem creating icon. " + err);
    }

    callback(err, oldIcon);
  });
}

exports.remove = function(options, callback) {
  var condition = {
    formId: options.formId
  };

  if (options.type) condition.type = options.type;
  if (options.variant) condition.variant = options.variant;

  Icon.remove(condition, function(err) {
    if (err) {
      console.log("Could not remove icons: " + err);
    }

    callback(err);
  });
}
