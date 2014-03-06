var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var IconSchema = new Schema({
  contentType: { type: String, required: false },  
  size: { type: String, required: false },  
  name: { type: String, required: false },
  relativePath: { type: String, required: true }
},{ 
    versionKey: false
});

var transform = function(form, ret, options) {
  ret.id = form._id;

  delete ret._id;
}

IconSchema.set("toObject", {
  transform: transform
});

IconSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the Layer Schema
var Icon = mongoose.model('Icon', IconSchema);
exports.Model = Icon;

exports.getAll = function(callback) {
  Icon.find({}, function (err, icons) {
    if (err) {
      console.log("Error finding icons in mongo: " + err);
    }

    callback(err, icons);
  });
}

exports.getById = function(id, callback) {
  Icon.findById(id, function (err, icon) {
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

exports.remove = function(id, callback) {
  Icon.findByIdAndRemove(id, function(err) {
    if (err) {
      console.log("Could not remove form: " + err);
    }

    callback(err);
  });
}