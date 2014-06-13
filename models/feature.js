var mongoose = require('mongoose')
  , async = require('async')
  , moment = require('moment')
  , Layer = require('../models/layer');

var Schema = mongoose.Schema;

var StateSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

var AttachmentSchema = new Schema({
  lastModified: {type: Date, required: false},
  contentType: { type: String, required: false },
  size: { type: Number, required: false },
  name: { type: String, required: false },
  relativePath: { type: String, required: true },
  width: { type: Number, required: false },
  height: { type: Number, required: false },
  oriented: {type: Boolean, required: true, default: false },
  thumbnails: [ThumbnailSchema]
},{
  strict: false
});

var ThumbnailSchema = new Schema({
  contentType: { type: String, required: false },
  size: { type: Number, required: false },
  name: { type: String, required: false },
  relativePath: { type: String, required: true },
  minDimension: { type: Number, required: true },
  width: { type: Number, required: false },
  height: { type: Number, required: false}
},{
  strict: false
});

// Creates the Schema for the Attachments object
var FeatureSchema = new Schema({
  type: {type: String, required: true},
  lastModified: {type: Date, required: false},
  userId: {type: Schema.Types.ObjectId, required: false, sparse: true},
  deviceId: {type: Schema.Types.ObjectId, required: false, sparse: true},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed,
  attachments: [AttachmentSchema],
  states: [StateSchema]
},{
  strict: false
});

FeatureSchema.index({geometry: "2dsphere"});
FeatureSchema.index({'lastModified': 1});
FeatureSchema.index({'attachments.lastModified': 1});
FeatureSchema.index({'userId': 1});
FeatureSchema.index({'deviceId': 1});
FeatureSchema.index({'properties.type': 1});
FeatureSchema.index({'properties.timestamp': 1});
FeatureSchema.index({'states.name': 1});
FeatureSchema.index({'attachments.oriented': 1});
FeatureSchema.index({'attachments.contentType': 1});
FeatureSchema.index({'attachments.thumbnails.minDimension': 1});

var models = {};
var Attachment = mongoose.model('Attachment', AttachmentSchema);
var Thumbnail = mongoose.model('Thumbnail', ThumbnailSchema);
var State = mongoose.model('State', StateSchema);

// return a string for each property
var convertFieldForQuery = function(field, keys, fields) {
  keys = keys || [];
  fields = fields || {};

  for (var childField in field) {
    keys.push(childField);
    if (Object(field[childField]) === field[childField]) {
      convertFieldForQuery(field[childField], keys, fields);
    } else {
      var key = keys.join(".");
      if (field[childField]) fields[key] = field[childField];
      keys.pop();
    }
  }

  return fields;
}

var parseFields = function(fields) {
  if (fields) {
    var state = fields.state ? true : false;
    delete fields.state;

    fields = convertFieldForQuery(fields);
    if (fields.id === undefined) fields.id = true; // default is to return id if not specified
    if (fields.type === undefined) fields.type = true; // default is to return type if not specified

    if (state) {
      fields.states = {$slice: 1};
    }

    return fields;
  } else {
    return { states: {$slice: 1}};
  }
}

var featureModel = function(layer) {
  var name = layer.collectionName;
  var model = models[name];
  if (!model) {
    // Creates the Model for the Features Schema
    var model = mongoose.model(name, FeatureSchema, name);
    models[name] = model;
  }

  return model;
}

exports.featureModel = featureModel;

exports.getFeatures = function(layer, o, callback) {
  var conditions = {};
  var fields = parseFields(o.fields);

  var query = featureModel(layer).find(conditions, fields);

  var filter = o.filter || {};
  // Filter by geometry
  if (filter.geometry) {
    query.where('geometry').intersects.geometry(filter.geometry);
  }

  if (filter.startDate) {
    query.where('lastModified').gte(filter.startDate);
  }

  if (filter.endDate) {
    query.where('lastModified').lt(filter.endDate);
  }

  if (filter.states) {
    query.where('states.0.name').in(filter.states);
  }

  if (o.sort) {
    console.log('sort on ', o.sort);
    query.sort(o.sort);
  }

  query.lean().exec(function (err, features) {
    if (err) {
      console.log("Error finding features in mongo: " + err);
    }

    callback(features);
  });
}

exports.getFeatureById = function(layer, featureId, options, callback) {
  var fields = parseFields(options.fields);

  featureModel(layer).findById(featureId, fields, function(err, feature) {
    if (err) {
      console.log("Error finding feature in mongo: " + err);
    }

    callback(feature);
  });
}

exports.createFeature = function(layer, feature, callback) {
  feature.lastModified = moment.utc().toDate();

  featureModel(layer).create(feature, function(err, newFeature) {
    if (err) {
      console.log(JSON.stringify(err));
    }

    callback(newFeature);
  });
}

exports.createFeatures = function(layer, features, callback) {
  features.forEach(function(feature) {
    feature.properties = feature.properties || {};
  });

  featureModel(layer).create(features, function(err) {
    callback(err, features);
  });
}

exports.createGeoJsonFeature = function(layer, feature, callback) {
  var properties = feature.properties ? feature.properties : {};

  featureModel(layer).create(feature, function(err, newFeature) {
    if (err) {
      console.log('Error creating feature', err);
      console.log('feature is: ', feature);
    }

    callback(err, newFeature);
  });
}

exports.updateFeature = function(layer, featureId, feature, callback) {
  feature.lastModified = moment.utc().toDate();

  featureModel(layer).findByIdAndUpdate(featureId, feature, {new: true}, function (err, updatedFeature) {
    if (err) {
      console.log('Could not update feature', err);
    }

    callback(err, updatedFeature);
  });
}

exports.removeFeature = function(layer, featureId, callback) {
  featureModel(layer).findByIdAndRemove(featureId, function (err, feature) {
    if (err) {
      console.log('Could not remove feature', err);
    }

    callback(err, feature);
  });
}

exports.removeUser = function(user, callback) {
  var condition = { userId: user._id };
  var update = { '$unset': { userId: true } };
  var options = { multi: true };

  Layer.getLayers({type: 'Feature'}, function(err, layers) {
    async.each(layers, function(layer, done) {
      featureModel(layer).update(condition, update, options, function(err, numberAffected) {
        console.log('Remove deleted user from ' + numberAffected + ' documents for layer ' + layer.name);
        done();
      });
    },
    function(err){
      callback();
    });
  });
}

exports.removeDevice = function(device, callback) {
  var condition = { deviceId: device._id };
  var update = { '$unset': { deviceId: true } };
  var options = { multi: true };

  Layer.getLayers({type: 'Feature'}, function(err, layers) {
    async.each(layers, function(layer, done) {
      featureModel(layer).update(condition, update, options, function(err, numberAffected) {
        console.log('Remove deleted device from ' + numberAffected + ' documents for layer ' + layer.name);
        done();
      });
    },
    function(err){
      callback();
    });
  });
}

exports.addState = function(layer, id, state, callback) {
  var condition = {_id: mongoose.Types.ObjectId(id), 'states.0.name': {'$ne': state.name}};

  state._id = mongoose.Types.ObjectId();
  var update = {
    '$push': {
      states: {
        '$each': [state],
        '$position': 0
      }
    },
    '$set': {
      lastModified: moment.utc().toDate()
    }
  };

  featureModel(layer).collection.update(condition, update, {upsert: true}, function(err) {
    callback(err, state);
  });
}

exports.getAttachments = function(layer, id, callback) {
  var query = {};
  query[id.field] = id.id;
  var fields = {attachments: 1};
  featureModel(layer).findOne(query, fields, function(err, feature) {
    callback(feature.attachments);
  });
}

exports.getAttachment = function(layer, featureId, attachmentId, callback) {
  var id = {_id: featureId};
  var attachment = {"attachments": {"$elemMatch": {_id: attachmentId}}};
  var fields = {attachments: true};
  featureModel(layer).findOne(id, attachment, fields, function(err, feature) {
    var attachment = feature.attachments.length ? feature.attachments[0] : null;
    callback(attachment);
  });
}

exports.addAttachment = function(layer, id, file, callback) {
  if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  var condition = {};
  condition[id.field] = id.id;

  var attachment = new Attachment({
    contentType: file.mimetype,
    size: file.size,
    name: file.name,
    relativePath: file.relativePath,
    lastModified: new Date()
  });

  var update = {'$push': { attachments: attachment }, 'lastModified': new Date()};
  featureModel(layer).update(condition, update, function(err, feature) {
    if (err) {
      console.log('Error updating attachments from DB', err);
    }

    callback(err, attachment);
  });
}

exports.updateAttachment = function(layer, featureId, attachmentId, file, callback) {
  var condition = {_id: featureId, 'attachments._id': attachmentId};
  var set = {};
  if (file.name) set['attachments.$.name'] = file.name;
  if (file.type) set['attachments.$.type'] = file.type;
  if (file.size) set['attachments.$.size'] = file.size;
  if (file.width) set['attachments.$.width'] = file.width;
  if (file.height) set['attachments.$.height'] = file.height;
  if (file.oriented) set['attachments.$.oriented'] = file.oriented;

  set['attachments.$.lastModified'] = new Date();

  var update = { '$set': set };
  featureModel(layer).update(condition, update, function(err, feature) {
    if (err) {
      console.log('Error updating attachments from DB', err);
    }

    callback(err);
  });
}

exports.removeAttachment = function(feature, id, callback) {
  var attachments = {};
  attachments[id.field] = id.id;
  feature.update({'$pull': {attachments: attachments}}, function(err, number, raw) {
    if (err) {
      console.log('Error pulling attachments from DB', err);
    }

    callback(err);
  });
}

exports.addAttachmentThumbnail = function(layer, featureId, attachmentId, thumbnail, callback) {
  var condition = {_id: featureId, 'attachments._id': attachmentId};
  var update = {'$push': { 'attachments.$.thumbnails': thumbnail }};
  featureModel(layer).update(condition, update, function(err, feature) {
    if (err) {
      console.log('Error updating thumbnails to DB', err);
    }
    callback(err);
  });

}
