var mongoose = require('mongoose')
  , Counter = require('./counter');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Creates the Schema for the Attachments object
var LayerSchema = new Schema({  
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  collectionName: { type: String, required: true }
});

// Creates the Model for the Layer Schema
var Layer = mongoose.model('Layer', LayerSchema);

exports.getAll = function(callback) {
  var query = {};
  Layer.find(query, function (err, layers) {
    if (err) {
      console.log("Error finding layers in mongo: " + err);
    }

    callback(layers);
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

    var callback = function(err, index) {
      if (err) {
        console.error(err);
      }

      console.log('Created index ' + index);
    }

    // Create an index on the id field (not same as _id, which automatically gets an index)
    collection.ensureIndex({'properties.OBJECTID': 1}, {unique: true, background: true}, callback);

    // Create an index on the goemetry field
    collection.ensureIndex({'geometry': '2dsphere'}, callback);

    // Create an index on the attachment.id field
    collection.ensureIndex({'attachments.id': 1}, {unique: true, background: true, sparse: true}, callback);
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

exports.create = function(data, callback) {
  Counter.getNext('layer', function(id) {
    var layer = new Layer({
      id: id,
      name: data.name,
      collectionName: 'features' + id
    });

    layer.save(function(err, layer) {
      if (err) {
        console.log("Problem creating layer. " + err);
      } else {
        createFeatureCollection(layer);
      }

      callback(err, layer);
    });
  });
}

exports.update = function(layer, data, callback) {
  var query = {_id: layer._id};
  var update = {$set: {name: data.name}};
  var options = {new: true};
  Layer.findOneAndUpdate(query, update, options, function(err, layer) {
    if (layer) {
      console.log("Could not update layer: " + err);
    }

    callback(layer);
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