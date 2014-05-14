var mongoose = require('mongoose')
  , path = require('path')
  , url = require('url');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var IconSchema = new Schema({
  formId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: false },
  variant: { type: String, required: false },
  relativePath: {type: String, required: true }
},{
  versionKey: false
});

// Creates the Model for the Layer Schema
var Icon = mongoose.model('Icon', IconSchema);
exports.Model = Icon;

exports.getIcon = function(icon, callback) {
  Icon.findOne(icon, function (err, icon) {
    if (err) {
      console.log("Error finding icon in mongo: " + err);
    }

    callback(err, icon);
  });
}

exports.create = function(icon, callback) {
  Icon.create(icon, function(err, newIcon) {
    if (err) {
      console.log("Problem creating icon. " + err);
    }

    callback(err, newIcon);
  });
}

exports.remove = function(icon, callback) {
  Icon.findOneAndRemove(icon, function(err, removedIcon) {
    if (err) {
      console.log("Could not remove form: " + err);
    }

    callback(err, removedIcon);
  });
}
