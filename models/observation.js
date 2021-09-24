const mongoose = require('mongoose')
  , async = require('async')
  , Event = require('./event')
  , log = require('winston');

const Schema = mongoose.Schema;

// Collection to hold unique observation ids
const ObservationIdSchema = new Schema();
const ObservationId = mongoose.model('ObservationId', ObservationIdSchema);

// const FormSchema = new Schema({
//   formId: { type: Number, required: true }
// },{
//   strict: false
// });

// const PropertiesSchema = new Schema({
//   timestamp: { type: Date, required: true },
//   forms: [FormSchema]
// },{
//   strict: false
// });

const StateSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

const ThumbnailSchema = new Schema({
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

const AttachmentSchema = new Schema({
  observationFormId: { type: Schema.Types.ObjectId, required: true },
  fieldName: { type: String, required: true },
  lastModified: {type: Date, required: false},
  contentType: { type: String, required: false },
  size: { type: Number, required: false },
  name: { type: String, required: false },
  relativePath: { type: String, required: false },
  width: { type: Number, required: false },
  height: { type: Number, required: false },
  oriented: {type: Boolean, required: true, default: false },
  thumbnails: [ThumbnailSchema]
},{
  strict: false
});

// Creates the Schema for the Attachments object
const ObservationSchema = new Schema({
  type: { type: String, enum: ['Feature'], required: true},
  lastModified: {type: Date, required: false},
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: false, sparse: true},
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

  if (attachment.relativePath) {
    attachment.url = [observation.url, "attachments", attachment.id].join("/");
  }

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
    delete ret.__v;

    if (options.event) {
      ret.eventId = options.event._id;
    }

    const path = options.path ? options.path : "";
    ret.url = [path, observation.id].join("/");

    if (observation.states && observation.states.length) {
      ret.state = transformState(ret.states[0], ret);
      delete ret.states;
    }

    if (observation.properties && observation.properties.forms) {
      ret.properties.forms = ret.properties.forms.map(observationForm => {
        observationForm.id = observationForm._id;
        delete observationForm._id;
        return observationForm;
      });
    }

    if (observation.attachments) {
      ret.attachments = ret.attachments.map(function (attachment) {
        return transformAttachment(attachment, ret);
      });
    }

    const populatedUserId = observation.populated('userId');
    if (populatedUserId) {
      ret.user = ret.userId;
      // TODO Update mobile clients to handle observation.userId or observation.user.id
      // Leave userId as mobile clients depend on it for observation create/update,
      ret.userId =  populatedUserId;
    }

    const populatedImportantUserId = observation.populated('important.userId')
    if (populatedImportantUserId && ret.important) {
      ret.important.user = ret.important.userId
      delete ret.important.userId;
    }
  }
}

ObservationIdSchema.set("toJSON", {
  transform: transform
});

ObservationSchema.set('toJSON', {
  transform: transform
});

ObservationSchema.set('toObject', {
  transform: transform
});

const models = {};
mongoose.model('Attachment', AttachmentSchema);
mongoose.model('Thumbnail', ThumbnailSchema);
mongoose.model('State', StateSchema);

// return a string for each property
function convertFieldForQuery(field, keys, fields) {
  keys = keys || [];
  fields = fields || {};

  for (const childField in field) {
    keys.push(childField);
    if (Object(field[childField]) === field[childField]) {
      convertFieldForQuery(field[childField], keys, fields);
    } else {
      const key = keys.join(".");
      if (field[childField]) {
        fields[key] = field[childField];
      }
      keys.pop();
    }
  }

  return fields;
}

function parseFields(fields) {
  if (fields) {
    const state = fields.state ? true : false;
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
  const name = event.collectionName;
  let model = models[name];
  if (!model) {
    // Creates the Model for the Observation Schema
    model = mongoose.model(name, ObservationSchema, name);
    models[name] = model;
  }

  return model;
}

exports.observationModel = observationModel;

exports.getObservations = function(event, o, callback) {
  const conditions = {};

  const filter = o.filter || {};
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

  const options = {};
  if (o.sort) {
    options.sort = o.sort;
  }

  const fields = parseFields(o.fields);
  if (filter.attachments === true) {
    fields.attachments = {$slice: 0};
  }

  let query = observationModel(event).find(conditions, fields, options);

  if (o.populate) {
    query = query
      .populate({
        path: 'userId',
        select: 'displayName' })
      .populate({
        path: 'important.userId',
        select: 'displayName'
      });
  }

  query.exec(callback);
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
  const fields = parseFields(options.fields);

  observationModel(event).findById(observationId, fields, callback);
};

exports.updateObservation = function(event, observationId, update, callback) {
  let addAttachments = [];
  let removeAttachments = [];
  const {forms = []} = update.properties || {};
  forms.map(observationForm => {
      observationForm._id = observationForm._id || mongoose.Types.ObjectId();
      delete observationForm.id;
      return observationForm;
    })
    .forEach(observationForm => {
      const formDefinition = event.forms.find(form => form._id === observationForm.formId);
      Object.keys(observationForm).forEach(fieldName => {
        const fieldDefinition = formDefinition.fields.find(field => field.name === fieldName);
        if (fieldDefinition && fieldDefinition.type === 'attachment') {
          const attachments = observationForm[fieldName] || [];
          addAttachments = addAttachments.concat(attachments
            .filter(attachment => attachment.action === 'add') 
            .map(attachment => {
              return {
                observationFormId: observationForm._id,
                fieldName: fieldName,
                name: attachment.name,
                contentType: attachment.contentType
              }
            }));

          removeAttachments = removeAttachments.concat(attachments
            .filter(attachment => attachment.action === 'delete')
            .map(attachment => attachment.id )
          );

          delete observationForm[fieldName]
        }
      });
  });

  const ObservationModel = observationModel(event);
  ObservationModel.findById(observationId)
    .then(observation => {
      if (!observation) {
        observation = new ObservationModel({
          _id: observationId,
          userId: update.userId,
          deviceId: update.deviceId,
          states: [{ name: 'active', userId: update.userId }]
        });
      }

      observation.type = update.type;
      observation.geometry = update.geometry;
      observation.properties = update.properties;
      observation.attachments = observation.attachments.concat(addAttachments);
      observation.attachments = observation.attachments.filter(attachment => {
        return !removeAttachments.includes(attachment._id.toString()) 
      });

      return observation.save();
    })
    .then(observation => {
      return observation
        .populate({ path: 'userId', select: 'displayName' })
        .populate({ path: 'important.userId', select: 'displayName' })
        .execPopulate();
    })
    .then(observation => {
      callback(null, observation);
    })
    .catch(err => callback(err)); 
};

exports.removeObservation = function(event, observationId, callback) {
  observationModel(event).findByIdAndRemove(observationId, callback);
};

exports.removeUser = function(user, callback) {
  const condition = { userId: user._id };
  const update = { '$unset': { userId: true } };
  const options = { multi: true };

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
  const condition = { deviceId: device._id };
  const update = { '$unset': { deviceId: true } };
  const options = { multi: true };

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
  const condition = { _id: mongoose.Types.ObjectId(id), 'states.0.name': { '$ne': state.name } };
  state._id = mongoose.Types.ObjectId();
  const update = {
    '$push': {
      states: {
        '$each': [state],
        '$position': 0
      }
    }
  };

  observationModel(event).update(condition, update, {upsert: false}, function(err) {
    callback(err, state);
  });
};

exports.addFavorite = function(event, observationId, user, callback) {
  const update = {
    $addToSet: {
      favoriteUserIds: user._id
    }
  };

  observationModel(event).findByIdAndUpdate(observationId, update, {new: true}, callback);
};

exports.removeFavorite = function (event, observationId, user, callback) {
  const update = {
    $pull: {
      favoriteUserIds: user._id
    }
  };

  observationModel(event).findByIdAndUpdate(observationId, update, {new: true}, callback);
};

exports.addImportant = function(event, observationId, important, callback) {
  const update = { important};

  observationModel(event)
    .findByIdAndUpdate(observationId, update, { new: true })
    .populate({ path: 'userId', select: 'displayName' })
    .populate({ path: 'important.userId', select: 'displayName' })
    .exec(callback);
}

exports.removeImportant = function(event, id, callback) {
  const update = {
    '$unset': {
      important: 1
    }
  };

  observationModel(event).findByIdAndUpdate(id, update, {new: true}, callback);
};

exports.getAttachment = function(event, observationId, attachmentId, callback) {
  const condition = {
    _id: observationId,
    'attachments._id': attachmentId,
  }

  observationModel(event).findOne(condition, function (err, observation) {
    const attachment = observation.attachments.find(attachment => attachment._id.toString() === attachmentId);
    callback(err, attachment);
  });
};

exports.addAttachment = function(event, observationId, attachmentId, file, callback) {
  const condition = {
    _id: observationId,
    attachments: {
      '$elemMatch': {
        _id: attachmentId,
        contentType: file.mimetype,
        name: file.originalname
      }
    }
  }

  const update = {
    'attachments.$.size': file.size,
    'attachments.$.relativePath': file.relativePath
  }

  observationModel(event).findOneAndUpdate(condition, update, {new: true}, function(err, observation) {
    if (err || !observation) return callback(err);

    const attachment = observation.attachments.find(attachment => attachment._id.toString() === attachmentId);
    callback(err, attachment);
  });
};

exports.removeAttachment = function(event, observationId, attachmentId, callback) {
  const update = { $pull: { attachments: { _id: attachmentId } } };
  observationModel(event).findByIdAndUpdate(observationId, update, callback);
};

exports.addAttachmentThumbnail = function(event, observationId, attachmentId, thumbnail, callback) {
  const condition = {_id: observationId, 'attachments._id': attachmentId};
  const update = {'$push': { 'attachments.$.thumbnails': thumbnail }};
  observationModel(event).update(condition, update, callback);
};
