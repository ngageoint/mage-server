var mongoose = require('mongoose')
  , Counter = require('./counter');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Creates the Schema for the Attachments object
var LayerSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  type: { type: String, required: true },
  base: { type: Boolean, required: false },
  name: { type: String, required: true, unique: true },
  format: { type: String, required: false },
  url: { type: String, required: false },
  description: { type: String, required: false },
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

  var query = {};
  var type = filter.type;
  if (type) query.type = type;

  var ids = filter.ids;
  if (ids) query.id = {$in: ids};

  Layer.find(query, function (err, layers) {
    if (err) {
      console.log("Error finding layers in mongo: " + err);
    }

    callback(err, layers);
  });
}

exports.getById = function(id, callback) {
  var query = {'id': id};
  Layer.findOne(query, function (err, layer) {
    if (err) {
      console.log("Error finding layer in mongo: " + err);
    }

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

var dropFeatureCollection = function(layer) {
  console.log("Dropping collection: " + layer.collectionName);
  mongoose.connection.db.dropCollection(layer.collectionName, function(err, results) {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Dropped collection ' + layer.collectionName);
  });
}

exports.create = function(layer, callback) {
  Counter.getNext('layer', function(id) {
    layer.id = id;

    if (layer.type == 'Feature' || layer.type == 'External') {
      layer.collectionName = 'features' + id;
    }

    Layer.create(layer, function(err, newLayer) {
      if (err) {
        console.log("Problem creating layer. " + err);
      } else {
        if (layer.type == 'Feature') {
          createFeatureCollection(newLayer);
        }
      }

      callback(err, newLayer);
    });
  });
}

exports.update = function(id, layer, callback) {
  var conditions = {id: id};

  Layer.findOneAndUpdate(conditions, layer, function(err, updatedLayer) {
    if (err) {
      console.log("Could not update layer: " + err);
    }

    callback(err, updatedLayer);
  });
}

exports.remove = function(layer, callback) {
  layer.remove(function(err) {
    if (err) {
      console.error(err);
    } else {
      // TODO probably want to figure out how to archive this rather than drop the collection
      dropFeatureCollection(layer);
    }

    callback(err, layer);
  });
}