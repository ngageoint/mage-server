var mongoose = require('mongoose')
  , Icon = require('./icon');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var OptionSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  value: { type: Number, required: true }
},{
  _id: false
});

var FieldSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: false },
  name: { type: String, required: true },
  required: { type: Boolean, required: true },
  choices: [OptionSchema]
},{
  _id: false
});

var FormSchema = new Schema({
  name: { type: String, required: true },
  variantField: {type:String},
  fields: [FieldSchema]
},{
    versionKey: false
});

FormSchema.pre('remove', function(done) {
  var form = this;


});

var transform = function(form, ret, options) {
  // Don't transform sub document
  if ('function' == typeof form.ownerDocument) return;

  ret.id = form._id;

  delete ret._id;
}

FormSchema.set("toObject", {
  transform: transform
});

FormSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the Layer Schema
var Form = mongoose.model('Form', FormSchema);
exports.Model = Form;

exports.getAll = function(callback) {
  Form.find({}, function (err, forms) {
    if (err) {
      console.log("Error finding forms in mongo: " + err);
    }

    callback(err, forms);
  });
}

exports.getById = function(id, callback) {
  Form.findById(id, function (err, form) {
    if (err) {
      console.log("Error finding form in mongo: " + err);
    }

    callback(err, form);
  });
}

exports.create = function(form, callback) {
  Form.create(form, function(err, newForm) {
    if (err) {
      console.log("Problem creating form. " + err);
    }

    callback(err, newForm);
  });
}

exports.update = function(id, form, callback) {
  Form.findByIdAndUpdate(id, form, function(err, updatedForm) {
    if (err) {
      console.log("Could not update form: " + err);
    }

    callback(err, updatedForm);
  });
}

exports.remove = function(id, callback) {
  Form.findByIdAndRemove(id, function(err) {
    if (err) {
      console.log("Could not remove form: " + err);
    }

    Icon.remove({formId: id}, function(err) {
      callback(err);
    });
  });
}
