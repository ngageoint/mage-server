var mongoose = require('mongoose')
  , moment = require('moment')
  , Counter = require('./counter');

var Schema = mongoose.Schema;

var StateSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

var AttachmentSchema = new Schema({
  id: { type: Number, required: true },
  contentType: { type: String, required: false },  
  size: { type: String, required: false },  
  name: { type: String, required: false },
  relativePath: { type: String, required: true }
});

// Creates the Schema for the Attachments object
var FeatureSchema = new Schema({
  type: {type: String, required: true},
  timestamp: {type: Date, required: true},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed,
  attachments: [AttachmentSchema],
  states: [StateSchema]
});

FeatureSchema.index({geometry: "2dsphere"});
FeatureSchema.index({'timestamp': 1});
FeatureSchema.index({'properties.OBJECTID': 1});
FeatureSchema.index({'states.name': 1});
FeatureSchema.index({'attachments.id': 1});

var models = {};
var Attachment = mongoose.model('Attachment', AttachmentSchema);
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
    return {states: {$slice: 1}};
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
    query.where('timestamp').gte(filter.startDate);
  }

  if (filter.endDate) {
    query.where('timestamp').lt(filter.endDate);
  }

  query.exec(function (err, features) {
    if (err) {
      console.log("Error finding features in mongo: " + err);
    }
    
    callback(features);
  });
}

exports.getFeatureById = function(layer, id, options, callback) {
  if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  var conditions = {};
  conditions[id.field] = id.id;

  var fields = parseFields(options.fields);

  featureModel(layer).findOne(conditions, fields).exec(function (err, feature) {
    if (err) {
      console.log("Error finding feature in mongo: " + err);
    }

    callback(feature);
  });
}

exports.createFeature = function(layer, feature, callback) {
  var name = 'feature' + layer.id;
  Counter.getNext(name, function(id) {
    feature.properties.OBJECTID = id;
    feature.timestamp = moment.utc().toDate();

    featureModel(layer).create(feature, function(err, newFeature) {
      if (err) {
        console.log(JSON.stringify(err));
      }

      callback(newFeature);
    });
  });
}

exports.createFeatures = function(layer, features, callback) {
  var name = 'feature' + layer.id;
  Counter.getGroup(name, features.length, function(ids) {
    var i = 0;
    features.forEach(function(feature) {
      feature.properties = feature.properties || {};
      feature.properties.OBJECTID = ids[i];
      i++;
    });

    featureModel(layer).create(features, function(err) {
      callback(err, features);
    });
  });
}

exports.createGeoJsonFeature = function(layer, feature, callback) {
  var name = 'feature' + layer.id;
  Counter.getNext(name, function(id) {
    var properties = feature.properties ? feature.properties : {};
    properties.OBJECTID = id;

    featureModel(layer).create(feature, function(err, newFeature) {
      if (err) {
        console.log('Error creating feature', err);
        console.log('feature is: ', feature);
      }

      callback(err, newFeature);
    }); 
  });
}

exports.updateFeature = function(layer, id, feature, callback) {
  if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  var query = {};
  query[id.field] = id.id;
  var update = {
    geometry: feature.geometry,
    properties: feature.properties || {}
  };
  update.timestamp = moment.utc().toDate();

  featureModel(layer).findOneAndUpdate(query, update, {new: true}, function (err, updatedFeature) {
    if (err) {
      console.log('Could not update feature', err);
    }

    callback(err, updatedFeature);
  });
}

exports.removeFeature = function(layer, id, callback) {
  if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  var query = {};
  query[id.field] = id.id;
  featureModel(layer).findOneAndRemove(query, function (err, feature) {
    if (err) {
      console.log('Could not remove feature', err);
    }

    callback(err, feature);
  });
}


// IMPORTANT:
// This is a complete hack to get the new state to insert into
// the beginning of the array.  Once mongo 2.6 is released
// we can use the $push -> $each -> $position operator
exports.addState = function(layer, id, state, callback) {
  var condition = {_id: mongoose.Types.ObjectId(id), 'states.0.name': {'$ne': state.name}};

  state._id = mongoose.Types.ObjectId();
  var update = {'$set': {'states.-1': state}};

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

exports.getAttachment = function(layer, id, attachmentId, callback) {
  var query = {};
  query[id.field] = id.id;
  var fields = {attachments: 1};
  featureModel(layer).findOne(query, fields, function(err, feature) {
    var attachments = feature.attachments.filter(function(attachment) {
      return (attachment.id == attachmentId);
    });

    var attachment = attachments.length ? attachments[0] : null;
    callback(attachment);
  });
}

exports.addAttachment = function(layer, id, file, callback) {  
  var counter = 'attachment' + layer.id;
  Counter.getNext(counter, function(attachmentId) {
    if (id !== Object(id)) {
      id = {id: id, field: '_id'};
    }

    var condition = {};
    condition[id.field] = id.id;
    var attachment = new Attachment({
      id: attachmentId,
      contentType: file.headers['content-type'],  
      size: file.size,
      name: file.name,
      relativePath: file.relativePath
    });

    var update = {'$push': { attachments: attachment }, 'timestamp': new Date()};
    featureModel(layer).update(condition, update, function(err, feature) {
      if (err) {
        console.log('Error updating attachments from DB', err);
      }

      callback(err, attachment);
    });
  });
}

exports.updateAttachment = function(layer, attachmentId, file, callback) {
  var condition = {'attachments.id': attachmentId};
  var update = {
    '$set': {
      'attachments.$.name': filesname,
      'attachments.$.type': file.type,
      'attachments.$.size': file.size
    },
    timestamp: new Date()
  };

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