var mongoose = require('mongoose')
  , Counter = require('./counter');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Creates the Schema for the Attachments object
var LayerSchema = new Schema({
  _id: { type: Number, required: true, unique: true },
  type: { type: String, required: true },
  base: { type: Boolean, required: false },
  name: { type: String, required: true, unique: true },
  format: { type: String, required: false },
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

var transform = function(layer, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.collectionName;
}

LayerSchema.set("toObject", {
  transform: transform
});

LayerSchema.set("toJSON", {
  transform: transform
});

// Validate the layer before save
LayerSchema.pre('save', function(next) {
  var layer = this;
  //TODO validate layer before save
  next();
});

// Creates the Model for the Layer Schema
var Layer = mongoose.model('Layer', LayerSchema);
exports.Model = Layer;

exports.getLayers = function(filter, callback) {
  if (typeof filter == 'function') {
    callback = filter;
    filter = {};
  }

  var conditions = {};
  if (filter.type) conditions.type = filter.type;
  if (filter.layerIds) conditions._id = {$in: filter.layerIds};

  Layer.find(conditions, function (err, layers) {
    callback(err, layers);
  });
}

exports.getById = function(id, callback) {
  Layer.findById(id, function (err, layer) {
    callback(layer);
  });
}

var createFeatureCollection = function(layer) {
  console.log("Creating collection: " + layer.collectionName + ' for layer ' + layer.name);
  mongoose.connection.db.createCollection(layer.collectionName, function(err, collection) {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Successfully created feature collection for layer " + layer.name);
  });
}

var dropFeatureCollection = function(layer, callback) {
  console.log("Dropping collection: " + layer.collectionName);
  mongoose.connection.db.dropCollection(layer.collectionName, function(err, results) {
    if (err) return callback(err);

    console.log('Dropped collection ' + layer.collectionName);
    callback();
  });
}

exports.create = function(layer, callback) {
  Counter.getNext('layer', function(id) {
    layer._id = id;

    if (layer.type == 'Feature') {
      layer.collectionName = 'features' + id;
    }

    Layer.create(layer, function(err, newLayer) {
      if (err) return callback(err);

      if (layer.type == 'Feature') {
        createFeatureCollection(newLayer);
      }

      callback(err, newLayer);
    });
  });
}

exports.update = function(id, layer, callback) {
  Layer.findByIdAndUpdate(id, layer, function(err, updatedLayer) {
    callback(err, updatedLayer);
  });
}

exports.remove = function(layer, callback) {
  layer.remove(function(err) {
    if (err) return callback(err);

    dropFeatureCollection(layer, function(err) {
      callback(err, layer);
    });
  });
}
