var mongoose = require('mongoose')
  , async = require('async')
  , moment = require('moment')
  , Event = require('../models/event');

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
var ObservationSchema = new Schema({
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

ObservationSchema.index({geometry: "2dsphere"});
ObservationSchema.index({'lastModified': 1});
ObservationSchema.index({'attachments.lastModified': 1});
ObservationSchema.index({'userId': 1});
ObservationSchema.index({'deviceId': 1});
ObservationSchema.index({'properties.type': 1});
ObservationSchema.index({'properties.timestamp': 1});
ObservationSchema.index({'states.name': 1});
ObservationSchema.index({'attachments.oriented': 1});
ObservationSchema.index({'attachments.contentType': 1});
ObservationSchema.index({'attachments.thumbnails.minDimension': 1});

var models = {};
var Attachment = mongoose.model('Attachment', AttachmentSchema);
var Thumbnail = mongoose.model('Thumbnail', ThumbnailSchema);
var State = mongoose.model('State', StateSchema);

// return a string for each property
function convertFieldForQuery(field, keys, fields) {
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

function parseFields(fields) {
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

function observationModel(event) {
  var name = event.collectionName;
  var model = models[name];
  if (!model) {
    // Creates the Model for the Features Schema
    var model = mongoose.model(name, ObservationSchema, name);
    models[name] = model;
  }

  return model;
}

exports.observationModel = observationModel;

exports.getObservations = function(event, o, callback) {
  var conditions = {};

  var filter = o.filter || {};
  // Filter by geometry
  if (filter.geometry) {
    conditions.geometry = {
      $geoIntersects: {
        $geometry: filter.geometry
      }
    };
  }

  if (filter.startDate) {
    conditions.lastModified = {$gte: filter.startDate};
  }

  if (filter.endDate) {
    conditions.lastModified = {$lt: filter.endDate};
  }

  if (filter.states) {
    conditions['states.0.name'] = {$in: filter.states};
  }

  var options = {}
  if (o.sort) {
    options.sort = o.sort;
  }

  var fields = parseFields(o.fields);
  observationModel(event).find(conditions, fields, options).lean().exec(function (err, observations) {
    callback(err, observations);
  });
}

exports.getObservationById = function(event, observationId, options, callback) {
  var fields = parseFields(options.fields);

  observationModel(event).findById(observationId, fields, function(err, observation) {
    callback(err, observation);
  });
}

exports.createObservation = function(event, observation, callback) {
  observation.lastModified = moment.utc().toDate();

  observationModel(event).create(observation, function(err, newObservation) {
    callback(err, newObservation);
  });
}

exports.updateObservation = function(event, observationId, observation, callback) {
  observation.lastModified = moment.utc().toDate();

  observationModel(event).findByIdAndUpdate(observationId, observation, {new: true}, function (err, updatedObservation) {
    callback(err, updatedObservation);
  });
}

exports.removeObservation = function(event, observationId, callback) {
  observationModel(event).findByIdAndRemove(observationId, function (err, observation) {
    callback(err, feature);
  });
}

exports.removeUser = function(user, callback) {
  var condition = { userId: user._id };
  var update = { '$unset': { userId: true } };
  var options = { multi: true };

  Event.getEvents({}, function(err, events) {
    async.each(events, function(event, done) {
      observationModel(event).update(condition, update, options, function(err, numberAffected) {
        console.log('Remove deleted user from ' + numberAffected + ' documents for event ' + event.name);
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

  Events.getEvents(function(err, events) {
    async.each(events, function(event, done) {
      observationModel(event).update(condition, update, options, function(err, numberAffected) {
        console.log('Remove deleted device from ' + numberAffected + ' documents for event ' + event.name);
        done();
      });
    },
    function(err){
      callback();
    });
  });
}

exports.addState = function(event, id, state, callback) {
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

  observationModel(event).collection.update(condition, update, {upsert: true}, function(err) {
    callback(err, state);
  });
}

exports.getAttachments = function(event, id, callback) {
  var query = {};
  query[id.field] = id.id;
  var fields = {attachments: 1};
  observationModel(event).findOne(query, fields, function(err, observation) {
    callback(observation.attachments);
  });
}

exports.getAttachment = function(event, observationId, attachmentId, callback) {
  var id = {_id: observationId};
  var attachment = {"attachments": {"$elemMatch": {_id: attachmentId}}};
  var fields = {attachments: true};
  observationModel(event).findOne(id, attachment, fields, function(err, observation) {
    if (err) return callback(err);

    var attachment = observation.attachments.length ? observation.attachments[0] : null;
    callback(err, attachment);
  });
}

exports.addAttachment = function(event, id, file, callback) {
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
  observationModel(event).update(condition, update, function(err, observation) {
    callback(err, attachment);
  });
}

exports.updateAttachment = function(event, observationId, attachmentId, file, callback) {
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
  observationModel(event).update(condition, update, function(err, observation) {
    callback(err);
  });
}

exports.removeAttachment = function(observation, id, callback) {
  var attachments = {};
  attachments[id.field] = id.id;
  observation.update({'$pull': {attachments: attachments}}, function(err, number, raw) {
    callback(err);
  });
}

exports.addAttachmentThumbnail = function(event, observationId, attachmentId, thumbnail, callback) {
  var condition = {_id: observationId, 'attachments._id': attachmentId};
  var update = {'$push': { 'attachments.$.thumbnails': thumbnail }};
  observationModel(event).update(condition, update, function(err, observation) {
    callback(err);
  });
}
