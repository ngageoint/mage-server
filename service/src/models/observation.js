const mongoose = require('mongoose')
  , async = require('async')
  , Event = require('./event')
  , log = require('winston');


// TODO: are these necessary?
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
      fields.states = { $slice: 1 };
    }

    return fields;
  } else {
    return { states: { $slice: 1 } };
  }
}

exports.getObservations = function (event, o, callback) {
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
    conditions['important'] = { $exists: true };
  }

  const options = {};
  if (o.sort) {
    options.sort = o.sort;
  }

  const fields = parseFields(o.fields);
  if (filter.attachments === true) {
    fields.attachments = { $slice: 0 };
  }

  let query = observationModel(event).find(conditions, fields, options);

  if (o.lean) {
    query = query.lean();
  }

  if (o.populate) {
    query = query
      .populate({
        path: 'userId',
        select: 'displayName'
      })
      .populate({
        path: 'important.userId',
        select: 'displayName'
      });
  }

  if (o.stream) {
    return query.cursor();
  } else {
    query.exec(callback);
  }
};

exports.getObservationById = function (event, observationId, options, callback) {
  const fields = parseFields(options.fields);

  observationModel(event).findById(observationId, fields, callback);
};

exports.removeObservation = function (event, observationId, callback) {
  observationModel(event).findByIdAndRemove(observationId, callback);
};

exports.removeUser = function (user, callback) {
  const condition = { userId: user._id };
  const update = { '$unset': { userId: true } };
  const options = { multi: true };

  Event.getEvents({}, function (err, events) {
    async.each(events, function (event, done) {
      observationModel(event).update(condition, update, options, function (err, numberAffected) {
        log.info('Remove deleted user from ' + numberAffected + ' documents for event ' + event.name);
        done();
      });
    },
      function (err) {
        callback(err);
      });
  });
};

exports.removeDevice = function (device, callback) {
  const condition = { deviceId: device._id };
  const update = { '$unset': { deviceId: true } };
  const options = { multi: true };

  Event.getEvents(function (err, events) {
    async.each(events, function (event, done) {
      observationModel(event).update(condition, update, options, function (err, numberAffected) {
        log.info('Remove deleted device from ' + numberAffected + ' documents for event ' + event.name);
        done();
      });
    },
      function (err) {
        callback(err);
      });
  });
};

exports.addState = function (event, id, state, callback) {
  const condition = { _id: new mongoose.Types.ObjectId(id), 'states.0.name': { '$ne': state.name } };
  state._id = new mongoose.Types.ObjectId();
  const update = {
    '$push': {
      states: {
        '$each': [state],
        '$position': 0
      }
    }
  };

  observationModel(event).update(condition, update, { upsert: false }, function (err) {
    callback(err, state);
  });
};

exports.addFavorite = function (event, observationId, user, callback) {
  const update = {
    $addToSet: {
      favoriteUserIds: user._id
    }
  };

  observationModel(event).findByIdAndUpdate(observationId, update, { new: true }, callback);
};

exports.removeFavorite = function (event, observationId, user, callback) {
  const update = {
    $pull: {
      favoriteUserIds: user._id
    }
  };

  observationModel(event).findByIdAndUpdate(observationId, update, { new: true }, callback);
};

exports.addImportant = function (event, observationId, important, callback) {
  const update = { important };

  observationModel(event)
    .findByIdAndUpdate(observationId, update, { new: true })
    .populate({ path: 'userId', select: 'displayName' })
    .populate({ path: 'important.userId', select: 'displayName' })
    .exec(callback);
}

exports.removeImportant = function (event, id, callback) {
  const update = {
    '$unset': {
      important: 1
    }
  };

  observationModel(event).findByIdAndUpdate(id, update, { new: true }, callback);
};

exports.getAttachment = function (event, observationId, attachmentId, callback) {
  const condition = {
    _id: observationId,
    'attachments._id': attachmentId,
  }

  observationModel(event).findOne(condition, function (err, observation) {
    const attachment = observation.attachments.find(attachment => attachment._id.toString() === attachmentId);
    callback(err, attachment);
  });
};

/**
 * TODO: [OBS-NEXT] this can potentially be deleted if removing the api/attachment module,
 * which is the only reference to this function
 */
exports.addAttachment = function (event, observationId, attachmentId, file, callback) {
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

  observationModel(event).findOneAndUpdate(condition, update, { new: true }, function (err, observation) {
    if (err || !observation) return callback(err);

    const attachment = observation.attachments.find(attachment => attachment._id.toString() === attachmentId);
    callback(err, attachment);
  });
};

exports.removeAttachment = function (event, observationId, attachmentId, callback) {
  const update = { $pull: { attachments: { _id: attachmentId } } };
  observationModel(event).findByIdAndUpdate(observationId, update, callback);
};

exports.addAttachmentThumbnail = function (event, observationId, attachmentId, thumbnail, callback) {
  const condition = { _id: observationId, 'attachments._id': attachmentId };
  const update = { '$push': { 'attachments.$.thumbnails': thumbnail } };
  observationModel(event).update(condition, update, callback);
};
