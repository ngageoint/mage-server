var mongoose = require('mongoose')
  , Counter = require('./counter')
  , Event = require('./event')
  , log = require('winston');

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

exports.getLayers = function(filter, callback) {
  if (typeof filter === 'function') {
    callback = filter;
    filter = {};
  }

  var conditions = {};
  if (filter.type) conditions.type = filter.type;
  if (filter.layerIds) conditions._id = {$in: filter.layerIds};

  Layer.find(conditions, function (err, layers) {
    callback(err, layers);
  });
};

exports.count = function(callback) {
  Layer.count({}, function(err, count) {
    callback(err, count);
  });
};

exports.getById = function(id, callback) {
  Layer.findById(id, function (err, layer) {
    callback(layer);
  });
};

var createFeatureCollection = function(layer) {
  log.info("Creating collection: " + layer.collectionName + ' for layer ' + layer.name);
  mongoose.connection.db.createCollection(layer.collectionName, function(err) {
    if (err) {
      log.error(err);
      return;
    }

    log.info("Successfully created feature collection for layer " + layer.name);
  });
};

var dropFeatureCollection = function(layer, callback) {
  log.info("Dropping collection: " + layer.collectionName);
  mongoose.connection.db.dropCollection(layer.collectionName, function(err) {
    if (err) return callback(err);

    log.info('Dropped collection ' + layer.collectionName);
    callback();
  });
};

exports.create = function(layer, callback) {
  Counter.getNext('layer', function(id) {
    layer._id = id;

    if (layer.type === 'Feature' || layer.type === 'Sensor') {
      layer.collectionName = 'features' + id;
    }

    Layer.create(layer, function(err, newLayer) {
      if (err) return callback(err);

      if (layer.type === 'Feature' || layer.type === 'Sensor') {
        createFeatureCollection(newLayer);
      }

      callback(err, newLayer);
    });
  });
};

exports.update = function(id, layer, callback) {
  Layer.findByIdAndUpdate(id, layer, {new: true}, function(err, updatedLayer) {
    callback(err, updatedLayer);
  });
};

exports.remove = function(layer, callback) {
  layer.remove(function(err) {
    if (err) return callback(err);

    dropFeatureCollection(layer, function(err) {
      callback(err, layer);
    });
  });
};
