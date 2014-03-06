var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var IconSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },  
  type: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  required: { type: Boolean, required: true }
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

exports.create = function(form, callback) {
  Icon.create(icon, function(err, newIcon) {
    if (err) {
      console.log("Problem creating icon. " + err);
    }

    callback(err, newIcon);
  });
}

// exports.update = function(id, form, callback) {
//   Form.findByIdAndUpdate(id, form, function(err, updatedForm) {
//     if (err) {
//       console.log("Could not update form: " + err);
//     }

//     callback(err, updatedForm);
//   });
// }

// exports.remove = function(id, callback) {
//   Form.findByIdAndRemove(id, function(err) {
//     if (err) {
//       console.log("Could not remove form: " + err);
//     }

//     callback(err);
//   });
// }