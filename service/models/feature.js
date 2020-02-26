var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Creates the Schema for the Attachments object
var FeatureSchema = new Schema({
  type: {type: String, required: true},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed
},{
  strict: false,
  versionKey: false,
  minimize: false
});

FeatureSchema.index({geometry: "2dsphere"});

function transform(feature, ret) {
  if ('function' !== typeof feature.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
  }
}

FeatureSchema.set("toJSON", {
  transform: transform
});

var models = {};

function featureModel(layer) {
  var name = layer.collectionName;
  var model = models[name];
  if (!model) {
    // Creates the Model for the Features Schema
    model = mongoose.model(name, FeatureSchema, name);
    models[name] = model;
  }

  return model;
}

exports.featureModel = featureModel;

exports.getFeatures = function(layer) {
  return featureModel(layer).find({}).exec();
};

exports.createFeatures = function(layer, features) {
  features.forEach(feature => feature.properties = feature.properties || {});
  return featureModel(layer).create(features);
};
