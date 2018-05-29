let mongoose = require('mongoose')
  , Event = require('./event')
  , log = require('winston');

// Creates a new Mongoose Schema object
let Schema = mongoose.Schema;

// Creates the Schema for the Attachments object
let LayerSchema = new Schema({
  _id: { type: Number, required: true, unique: true },
  type: { type: String, required: true },
  base: { type: Boolean, required: false },
  name: { type: String, required: true, unique: true },
  format: { type: String, required: false },
  file: {
    name: {type: String, required: false },
    contentType: {type: String, required: false },
    size: {type: String, required: false },
    relativePath: {type: String, required: false }
  },
  url: { type: String, required: false },
  description: { type: String, required: false },
  formId: {type: Schema.Types.ObjectId, required: false },
  wms: {
    layers: { type: String },
    styles: { type: String },
    format: { type: String },
    transparent: { type: Boolean },
    version: { type: String }
  },
  collectionName: { type: String, required: false }
},{
  versionKey: false
});

function transform(layer, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.collectionName;

  var path = options.path || "";
  if (ret.type === 'Feature') ret.url = [path, ret.id].join("/");
}

LayerSchema.set("toObject", {
  transform: transform
});

LayerSchema.set("toJSON", {
  transform: transform
});

// Validate the layer before save
LayerSchema.pre('save', function(next) {
  //TODO validate layer before save
  next();
});

LayerSchema.pre('remove', function(next) {
  var layer = this;

  Event.removeLayerFromEvents(layer, next);
});

// Creates the Model for the Layer Schema
var Layer = mongoose.model('Layer', LayerSchema);
exports.Model = Layer;

exports.getLayers = function(filter) {
  let conditions = {};
  if (filter.type) conditions.type = filter.type;
  if (filter.layerIds) conditions._id = {$in: filter.layerIds};

  return Layer.find(conditions).exec();
};

exports.count = function() {
  return Layer.count({}).exec();
};

exports.getById = function(id) {
  return Layer.findById(id).exec();
};

exports.createFeatureCollection = function(name) {
  return mongoose.connection.db.createCollection(name).then(function() {
    log.info("Successfully created feature collection for layer " + name);
  });
};

exports.dropFeatureCollection = function(layer) {
  return mongoose.connection.db.dropCollection(layer.collectionName).then(function() {
    log.info('Dropped collection ' + layer.collectionName);
  });
};

exports.create = function(id, layer) {
  layer._id = id;
  return Layer.create(layer);
};

exports.update = function(id, layer) {
  return Layer.findByIdAndUpdate(id, layer, {new: true}).exec();
};

exports.remove = function(layer) {
  return layer.remove();
};
