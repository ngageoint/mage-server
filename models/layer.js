const mongoose = require('mongoose'),
  Event = require('./event'),
  log = require('winston');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

// Creates the Schema for the Attachments object
const LayerSchema = new Schema(
  {
    _id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    state: { type: String, required: true, enum: ['available', 'unavailable', 'processing'] },
  },
  {
    discriminatorKey: 'type',
  },
);

const ImagerySchema = new Schema({
  url: { type: String, required: false },
  base: { type: Boolean, required: false },
  format: { type: String, required: false },
  wms: {
    layers: { type: String },
    styles: { type: String },
    format: { type: String },
    transparent: { type: Boolean },
    version: { type: String },
  },
});

const FeatureSchema = new Schema({
  collectionName: { type: String, required: false },
});

const GeoPackageSchema = new Schema({
  file: {
    name: { type: String, required: false },
    contentType: { type: String, required: false },
    size: { type: String, required: false },
    relativePath: { type: String, required: false },
  },
  tables: [
    {
      _id: false,
      name: { type: String },
      type: { type: String, enum: ['tile', 'feature'] },
      minZoom: { type: Number },
      maxZoom: { type: Number },
      bbox: [
        {
          type: Number,
        },
      ],
    },
  ],
  invalid: {
    type: {
      errors: [Schema.Types.Mixed],
    },
    default: undefined,
  },
  processing: {
    type: [
      {
        _id: false,
        count: { type: Number, required: false },
        total: { type: Number, required: false },
        description: { type: String, required: false },
        layer: { type: String, required: true },
        type: { type: String, enum: ['tile', 'feature'] },
        complete: { type: Boolean },
      },
    ],
    default: undefined,
  },
});

function transform(layer, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.collectionName;
  const path = options.path || '';
  if (ret.type === 'Feature') ret.url = path;
}

LayerSchema.set('toObject', {
  transform: transform,
});

LayerSchema.set('toJSON', {
  transform: transform,
});

// Validate the layer before save
LayerSchema.pre('save', function(next) {
  //TODO validate layer before save
  next();
});

LayerSchema.pre('remove', function(next) {
  const layer = this;

  Event.removeLayerFromEvents(layer, next);
});

// Creates the Model for the Layer Schema
const Layer = mongoose.model('Layer', LayerSchema);
exports.Model = Layer;

const ImageryLayer = Layer.discriminator('Imagery', ImagerySchema);
const FeatureLayer = Layer.discriminator('Feature', FeatureSchema);
const GeoPackageLayer = Layer.discriminator('GeoPackage', GeoPackageSchema);

exports.getLayers = function(filter) {
  const conditions = {};
  if (filter.type) conditions.type = filter.type;
  if (filter.layerIds) conditions._id = { $in: filter.layerIds };
  if (!filter.includeUnavailable) {
    conditions.state = { $eq: 'available' };
  }
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
    log.info('Successfully created feature collection for layer ' + name);
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
  let model;
  switch (layer.type) {
    case 'Imagery':
      model = ImageryLayer;
      break;
    case 'Feature':
      model = FeatureLayer;
      break;
    case 'GeoPackage':
      model = GeoPackageLayer;
      break;
  }

  return model.findByIdAndUpdate(id, layer, { new: true }).exec();
};

exports.remove = function(layer) {
  return layer.remove();
};
