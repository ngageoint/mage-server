var mongoose = require('mongoose')
  , async = require('async')
  , Event = require('./event')
  , log = require('winston');

var Schema = mongoose.Schema;

// Collection to hold unique observation ids
var ObservationIdSchema = new Schema();
var ObservationId = mongoose.model('ObservationId', ObservationIdSchema);

var StateSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
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

// Creates the Schema for the Attachments object
var ObservationSchema = new Schema({
  type: {type: String, required: true},
  lastModified: {type: Date, required: false},
  userId: {type: Schema.Types.ObjectId, required: false, sparse: true},
  deviceId: {type: Schema.Types.ObjectId, required: false, sparse: true},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed,
  attachments: [AttachmentSchema],
  states: [StateSchema],
  important: {
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: false},
    timestamp: {type: Date, required: false},
    description: {type: String, required: false}
  },
  favoriteUserIds: [{type: Schema.Types.ObjectId, ref: 'User'}]
},{
  strict: false,
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'lastModified'
  }
});

ObservationSchema.index({geometry: "2dsphere"});
ObservationSchema.index({'lastModified': 1});
ObservationSchema.index({'attachments.lastModified': 1});
ObservationSchema.index({'userId': 1});
ObservationSchema.index({'deviceId': 1});
ObservationSchema.index({'properties.timestamp': 1});
ObservationSchema.index({'states.name': 1});
ObservationSchema.index({'attachments.oriented': 1});
ObservationSchema.index({'attachments.contentType': 1});
ObservationSchema.index({'attachments.thumbnails.minDimension': 1});

function transformAttachment(attachment, observation) {
  attachment.id = attachment._id;
  delete attachment._id;
  delete attachment.thumbnails;

  attachment.url = [observation.url, "attachments", attachment.id].join("/");

  return attachment;
}

function transformState(state, observation) {
  state.id = state._id;
  delete state._id;

  state.url = [observation.url, "states", state.id].join("/");
  return state;
}

function transform(observation, ret, options) {
  if ('function' !== typeof observation.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;

    ret.eventId = options.eventId;

    var path = options.path ? options.path : "";
    ret.url = [path, observation.id].join("/");

    if (observation.attachments) {
      ret.attachments = ret.attachments.map(function(attachment) {
        return transformAttachment(attachment, ret);
      });
    }

    if (observation.states && observation.states.length) {
      ret.state = transformState(ret.states[0], ret);
      delete ret.states;
    }
  }
}

ObservationIdSchema.set("toJSON", {
  transform: transform
});

ObservationSchema.set("toJSON", {
  transform: transform
});

var models = {};
var Attachment = mongoose.model('Attachment', AttachmentSchema);
mongoose.model('Thumbnail', ThumbnailSchema);
mongoose.model('State', StateSchema);

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
    // Creates the Model for the Observation Schema
    model = mongoose.model(name, ObservationSchema, name);
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

  if (filter.startDate || filter.endDate) {
    conditions.lastModified = {};
    if (filter.startDate) {
      conditions.lastModified.$gte = filter.startDate;
    }

    if (filter.endDate) {
      conditions.lastModified.$lt = filter.endDate;
    }
  }

  if (filter.observationStartDate || filter.observationEndDate) {
    conditions['properties.timestamp'] = {};
    if (filter.observationStartDate) {
      conditions['properties.timestamp'].$gte = filter.observationStartDate;
    }

    if (filter.observationEndDate) {
      conditions['properties.timestamp'].$lt = filter.observationEndDate;
    }
  }

  if (filter.states) {
    conditions['states.0.name'] = { $in: filter.states };
  }

  if (filter.favorites && filter.favorites.userId) {
    conditions['favoriteUserIds'] = { $in: [filter.favorites.userId] };
  }

  if (filter.important) {
    conditions['important'] = {$exists: true};
  }

  var options = {};
  if (o.sort) {
    options.sort = o.sort;
  }

  var fields = parseFields(o.fields);
  observationModel(event).find(conditions, fields, options, callback);
};

// DEPRECATED backwards compat for creating an observation.  Will be removed in version 5.x.x
exports.createObservation = function(event, observation, callback) {
  observationModel(event).create(observation, callback);
};

exports.createObservationId = function(callback) {
  ObservationId.create({}, callback);
};

exports.getObservationId = function(id, callback) {
  ObservationId.findById(id, function(err, doc) {
    callback(err, doc ? doc._id : null);
  });
};

exports.getLatestObservation = function(event, callback) {
  observationModel(event).findOne({}, {lastModified: true}, {sort: {"lastModified": -1}, limit: 1}, callback);
};

exports.getObservationById = function(event, observationId, options, callback) {
  var fields = parseFields(options.fields);

  observationModel(event).findById(observationId, fields, callback);
};

exports.updateObservation = function(event, observationId, observation, callback) {
  observationModel(event).findByIdAndUpdate(observationId, observation, {new: true, upsert: true}, callback);
};

exports.removeObservation = function(event, observationId, callback) {
  observationModel(event).findByIdAndRemove(observationId, callback);
};

exports.removeUser = function(user, callback) {
  var condition = { userId: user._id };
  var update = { '$unset': { userId: true } };
  var options = { multi: true };

  Event.getEvents({}, function(err, events) {
    async.each(events, function(event, done) {
      observationModel(event).update(condition, update, options, function(err, numberAffected) {
        log.info('Remove deleted user from ' + numberAffected + ' documents for event ' + event.name);
        done();
      });
    },
    function(err){
      callback(err);
    });
  });
};

exports.removeDevice = function(device, callback) {
  var condition = { deviceId: device._id };
  var update = { '$unset': { deviceId: true } };
  var options = { multi: true };

  Event.getEvents(function(err, events) {
    async.each(events, function(event, done) {
      observationModel(event).update(condition, update, options, function(err, numberAffected) {
        log.info('Remove deleted device from ' + numberAffected + ' documents for event ' + event.name);
        done();
      });
    },
    function(err){
      callback(err);
    });
  });
};

exports.addState = function(event, id, state, callback) {
  var condition = {_id: mongoose.Types.ObjectId(id), 'states.0.name': {'$ne': state.name}};

  state._id = mongoose.Types.ObjectId();
  var update = {
    '$push': {
      states: {
        '$each': [state],
        '$position': 0
      }
    }
  };

  observationModel(event).update(condition, update, {upsert: true}, function(err) {
    callback(err, state);
  });
};

exports.addFavorite = function(event, observationId, user, callback) {
  var update = {
    $addToSet: {
      favoriteUserIds: user._id
    }
  };

  observationModel(event).findByIdAndUpdate(observationId, update, {new: true}, callback);
};

exports.removeFavorite = function (event, observationId, user, callback) {
  var update = {
    $pull: {
      favoriteUserIds: user._id
    }
  };

  observationModel(event).findByIdAndUpdate(observationId, update, {new: true}, callback);
};

exports.removeImportant = function(event, id, callback) {
  var update = {
    '$unset': {
      important: 1
    }
  };

  observationModel(event).findByIdAndUpdate(id, update, {new: true}, callback);
};

exports.getAttachment = function(event, observationId, attachmentId, callback) {
  var id = {_id: observationId};
  var attachment = {"attachments": {"$elemMatch": {_id: attachmentId}}};
  var fields = {attachments: true};
  observationModel(event).findOne(id, attachment, fields, function(err, observation) {
    if (err) return callback(err);

    var attachment = observation.attachments.length ? observation.attachments[0] : null;
    callback(err, attachment);
  });
};

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

  var update = {'$push': { attachments: attachment }};
  observationModel(event).update(condition, update, function(err) {
    callback(err, attachment);
  });
};

exports.updateAttachment = function(event, observationId, attachmentId, file, callback) {
  var condition = {_id: observationId, 'attachments._id': attachmentId};
  var set = {};
  if (file.name) set['attachments.$.name'] = file.name;
  if (file.type) set['attachments.$.contentType'] = file.type;
  if (file.size) set['attachments.$.size'] = file.size;
  if (file.width) set['attachments.$.width'] = file.width;
  if (file.height) set['attachments.$.height'] = file.height;
  if (file.oriented) set['attachments.$.oriented'] = file.oriented;

  set['attachments.$.lastModified'] = new Date();

  var update = { '$set': set };
  observationModel(event).findOneAndUpdate(condition, update, function(err, observation) {
    var attachments = observation.attachments.filter(function(attachment) {
      return attachment._id.toString() === attachmentId;
    });

    var attachment = null;
    if (attachments.length) {
      attachment = attachments[0];
    }

    callback(err, attachment);
  });
};

exports.removeAttachment = function(observation, id, callback) {
  var attachments = {};
  attachments[id.field] = id.id;
  observation.update({'$pull': {attachments: attachments}}, function(err) {
    callback(err);
  });
};

exports.addAttachmentThumbnail = function(event, observationId, attachmentId, thumbnail, callback) {
  var condition = {_id: observationId, 'attachments._id': attachmentId};
  var update = {'$push': { 'attachments.$.thumbnails': thumbnail }};
  observationModel(event).update(condition, update, function(err) {
    callback(err);
  });
};
