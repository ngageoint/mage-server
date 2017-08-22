var mongoose = require('mongoose')
  , async = require('async')
  , Counter = require('./counter')
  , User = require('./user')
  , Team = require('./team')
  , api = require('../api')
  , log = require('winston');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var OptionSchema = new Schema({
  id: { type: Number, required: true },
  title: {type: String, required: false, default: ''},
  value: { type: Number, required: true },
  blank: { type: Boolean, required: false }
},{
  _id: false
});

var FieldSchema = new Schema({
  id: { type: Number, required: true },
  archived: { type: Boolean, required: false},
  title: { type: String, required: true },
  type: { type: String, required: true, enum: ['textfield', 'numberfield', 'email', 'password', 'radio', 'dropdown', 'multiselectdropdown', 'date', 'geometry', 'textarea', 'checkbox', 'hidden'] },
  value: { type: Schema.Types.Mixed, required: false },
  name: { type: String, required: true },
  required: { type: Boolean, required: true },
  choices: [OptionSchema],
  min: { type: Number, required: false },
  max: { type: Number, required: false }
},{
  _id: false
});

var permissions = {
  OWNER: ['read', 'update', 'delete'],
  MANAGER: ['read', 'update'],
  GUEST: ['read']
};

function rolesWithPermission(permission) {
  var roles = [];

  for (var key in permissions) {
    if (permissions[key].indexOf(permission) !== -1) {
      roles.push(key);
    }
  }

  return roles;
}

// Creates the Schema for the Attachments object
var EventSchema = new Schema({
  _id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String, required: false },
  complete: { type: Boolean },
  collectionName: { type: String, required: true },
  teamIds: [{type: Schema.Types.ObjectId, ref: 'Team'}],
  layerIds: [{type: Number, ref: 'Layer'}],
  form: {
    variantField: { type: String, required: false },
    userFields: [String],
    fields: [FieldSchema]
  },
  acl: {}
},{
  minimize: false,
  versionKey: false
});

function hasFieldOnce(name) {
  return function(fields) {
    return fields.filter(function(field) {
      return field.name === name;
    }).length === 1;
  };
}

function fieldIsRequired(name) {
  return function(fields) {
    return fields.filter(function(field) {
      return field.name === name && field.required;
    }).length;
  };
}

EventSchema.path('form.fields').validate(hasFieldOnce('timestamp'), 'fields array must contain one timestamp field');
EventSchema.path('form.fields').validate(fieldIsRequired('timestamp'), 'timestamp must have a required property set to true.');
EventSchema.path('form.fields').validate(hasFieldOnce('geometry'), 'fields array must contain one geometry field');
EventSchema.path('form.fields').validate(fieldIsRequired('geometry'), 'geometry must have a required property set to true.');
EventSchema.path('form.fields').validate(hasFieldOnce('type'), 'fields array must contain one type field');
EventSchema.path('form.fields').validate(fieldIsRequired('type'), 'type must have a required property set to true.');

function validateTeamIds(eventId, teamIds, next) {
  if (!teamIds || !teamIds.length) return next();

  Team.getTeams({teamIds: teamIds}, function(err, teams) {
    if (err) return next(err);

    var containsInvalidTeam = teams.some(function(team) {
      return team.teamEventId && team.teamEventId !== eventId;
    });
    if (containsInvalidTeam) {
      var error = new Error("Cannot add a team that belongs specifically to another event");
      error.status = 405;
      return next(error);
    }

    next();
  });
}

EventSchema.pre('remove', function(next) {
  var event = this;

  async.parallel({
    collection: function(done) {
      dropObservationCollection(event, done);
    },
    icons: function(done) {
      new api.Icon(event._id).delete(function(err) {
        done(err);
      });
    },
    recentEventIds: function(done) {
      User.removeRecentEventForUsers(event, function(err) {
        done(err);
      });
    },
    attachments: function(done) {
      new api.Attachment(event).deleteAllForEvent(function(err) {
        log.info('done deleting attachments for event');
        done(err);
      });
    }
  },
  function(err) {
    next(err);
  });
});

EventSchema.post('remove', function(event) {
  if (event.populated('teamIds')) {
    event.depopulate('teamIds');
  }

  Team.getTeams({teamIds: event.teamIds}, function(err, teams) {
    if (err) log.error('Could not get teams for deleted event ' + event.name, err);

    var teamEvents = teams.filter(function(team) {
      return team.teamEventId && team.teamEventId === event._id;
    });

    if (teamEvents && teamEvents.length) {
      Team.deleteTeam(teamEvents[0], function(err) {
        if (err) log.error('Could not delete team for event ' + event.name);
      });
    }
  });
});

function transform(event, ret, options) {
  if ('function' !== typeof event.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.collectionName;

    if (event.populated('teamIds')) {
      ret.teams = ret.teamIds;
      delete ret.teamIds;
    }

    if (event.populated('layerIds')) {
      ret.layers = ret.layerIds;
      delete ret.layerIds;
    }

    // if read only permissions in event acl on return users acl
    if (options.access) {
      var userAccess = ret.acl[options.access.user._id];
      var roles = rolesWithPermission('update').concat(rolesWithPermission('delete'));
      if (!userAccess || roles.indexOf(userAccess) === -1) {
        var acl = {};
        acl[options.access.user._id] = ret.acl[options.access.user._id];
        ret.acl = acl;
      }
    }

    for (var userId in ret.acl) {
      ret.acl[userId] = {
        role: ret.acl[userId],
        permissions: permissions[ret.acl[userId]]
      };
    }
  }
}

EventSchema.set("toJSON", {
  transform: transform
});

EventSchema.set("toObject", {
  transform: transform
});

// Creates the Model for the Layer Schema
var Event = mongoose.model('Event', EventSchema);
exports.Model = Event;

// TODO look at filtering this in query, not after
function filterEventsByUserId(events, userId, callback) {
  Event.populate(events, 'teamIds', function(err, events) {
    if (err) return callback(err);

    var filteredEvents = events.filter(function(event) {
      // Check if user has read access to the event based on
      // being on a team that is in the event
      if (event.teamIds.some(function(team) { return team.userIds.indexOf(userId) !== -1; })) {
        return true;
      }

      // Check if user has read access to the event based on
      // being in the events access control listen
      if (event.acl[userId] && rolesWithPermission('read').some(function(role) { return role === event.acl[userId]; })) {
        return true;
      }

      return false;
    });

    callback(null, filteredEvents);
  });
}

function userHasEventPermission(event, userId, permission, callback) {
  getTeamsForEvent(event, function(err, teams) {
    if (err) return callback(err);

    // If asking for event read permission and user is part of a team in this event
    if (permission === 'read' && teams.some(function(team) { return team.userIds.indexOf(userId) !== -1; })) {
      return callback(null, true);
    }

    // Check if user has permission in event acl
    if (event.acl[userId] && rolesWithPermission(permission).some(function(role) { return role === event.acl[userId]; })) {
      return callback(null, true);
    }

    callback(null, false);
  });
}

function getTeamsForEvent(event, callback) {

  if (event.populated('teamIds')) {
    callback(null, event.teamIds);
  } else {
    Event.populate(event, 'teamIds', function(err, event) {
      if (err) return callback(err);

      callback(null, event.teamIds);
    });
  }
}

exports.count = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};
  if (options.access) {
    var accesses = [];
    rolesWithPermission(options.access.permission).forEach(function(role) {
      var access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    conditions['$or'] = accesses;
  }

  Event.count(conditions, function(err, count) {
    callback(err, count);
  });
};

exports.getEvents = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var query = {};
  var filter = options.filter || {};
  if (filter.complete === true) query.complete = true;
  if (filter.complete === false) query.complete = {$ne: true};

  Event.find(query, function (err, events) {
    if (err) return callback(err);

    var filters = [];

    // First filter out events user my not have access to
    if (options.access && options.access.user) {
      filters.push(function(done) {
        filterEventsByUserId(events, options.access.user._id, function(err, filteredEvents) {
          if (err) return done(err);

          events = filteredEvents;
          done();
        });
      });
    }

    // Filter again if filtering based on particular user
    if (options.filter && options.filter.userId) {
      filters.push(function(done) {
        filterEventsByUserId(events, options.filter.userId, function(err, filteredEvents) {
          if (err) return done(err);

          events = filteredEvents;
          done();
        });
      });
    }

    async.series(filters, function(err) {
      if (err) return callback(err);

      if (options.populate) {
        Event.populate(events, [{path: 'teamIds'}, {path: 'layerIds'}], function(err, events) {
          callback(err, events);
        });
      } else {
        callback(null, events);
      }
    });
  });
};

exports.getById = function(id, options, callback) {

  if (typeof options === 'function') {
    callback = options;

    options = {};
  }

  Event.findById(id, function (err, event) {
    if (err || !event) return callback(err);

    var filters = [];
    // First filter out events user my not have access to
    if (options.access && options.access.userId) {
      filters.push(function(done) {
        filterEventsByUserId([event], options.access.userId, function(err, events) {
          if (err) return done(err);
          event = events.length === 1 ? events[0] : null;
          done();
        });
      });
    }

    async.series(filters, function(err) {
      if (err) return callback(err);

      if (options.populate) {
        event.populate([{path: 'teamIds'}, {path: 'layerIds'}], function(err, events) {
          callback(err, events);
        });
      } else {
        event.depopulate('teamIds');
        event.depopulate('layerIds');
        callback(null, event);
      }
    });
  });
};

// TODO probably should live in event api
exports.filterEventsByUserId = filterEventsByUserId;
exports.userHasEventPermission = userHasEventPermission;

function createObservationCollection(event) {
  log.info("Creating observation collection: " + event.collectionName + ' for event ' + event.name);
  mongoose.connection.db.createCollection(event.collectionName, function(err) {
    if (err) {
      log.error(err);
      return;
    }

    log.info("Successfully created observation collection for event " + event.name);
  });
}

function dropObservationCollection(event, callback) {
  log.info("Dropping observation collection: " + event.collectionName);
  mongoose.connection.db.dropCollection(event.collectionName, function(err) {
    if (!err) {
      log.info('Dropped observation collection ' + event.collectionName);
    }

    callback(err);
  });
}

exports.create = function(event, user, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  async.waterfall([
    function(done) {
      Counter.getNext('event', function(id) {
        done(null, id);
      });
    },
    function(id, done) {
      event._id = id;
      event.collectionName = 'observations' + id;

      event.acl = {};
      event.acl[user._id.toString()] = 'OWNER';

      Event.create(event, function(err, newEvent) {
        if (err) return done(err);

        createObservationCollection(newEvent);

        done(null, newEvent);
      });
    },
    function(event, done) {
      Team.createTeamForEvent(event, user, function(err) {
        if (err) {
          // could not create the team for this event, remove the event and error out
          event.remove(function() {
            done(err);
          });
        }

        done(err, event);
      });
    }
  ], function(err, newEvent) {
    if (err) return callback(err);

    if (options.populate) {
      Event.populate(newEvent, {path: 'teamIds'}, function(err, event) {
        Event.populate(event, {path: 'teamIds.userIds', model: 'User'}, callback);
      });
    } else {
      callback(err, newEvent);
    }
  });
};

exports.update = function(id, event, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var update = ['name', 'description', 'complete', 'form'].reduce(function(o, k) {
    if (event[k] !== undefined) o[k] = event[k];
    return o;
  }, {});

  Event.findByIdAndUpdate(id, update, {new: true, runValidators: true, context: 'query'}, function(err, updatedEvent) {
    if (err) return callback(err);

    if (options.populate) {
      Event.populate(updatedEvent, {path: 'teamIds'}, function(err, event) {
        Event.populate(event, {path: 'teamIds.userIds', model: 'User'}, callback);
      });
    } else {
      callback(err, updatedEvent);
    }
  });
};

exports.addTeam = function(event, team, callback) {
  async.series([
    function(done) {
      validateTeamIds(event._id, [team.id], done);
    },
    function(done) {
      var update = {
        $addToSet: {
          teamIds: mongoose.Types.ObjectId(team.id)
        }
      };

      Event.findByIdAndUpdate(event._id, update, done);
    }
  ], function(err, results) {
    callback(err, results[1]);
  });

};

exports.removeTeam = function(event, team, callback) {
  var update = {
    $pull: {
      teamIds: { $in: [mongoose.Types.ObjectId(team.id)] }
    }
  };

  Event.findByIdAndUpdate(event._id, update, function(err, event) {
    callback(err, event);
  });
};

exports.addLayer = function(event, layer, callback) {
  var update = {
    $addToSet: {
      layerIds: layer.id
    }
  };

  Event.findByIdAndUpdate(event._id, update, function(err, event) {
    callback(err, event);
  });
};

exports.removeLayer = function(event, layer, callback) {
  var update = {
    $pull: {
      layerIds: { $in: [layer.id] }
    }
  };

  Event.findByIdAndUpdate(event._id, update, function(err, event) {
    callback(err, event);
  });
};

exports.removeLayerFromEvents = function(layer, callback) {
  var update = {
    $pull: {layerIds: layer._id}
  };
  Event.update({}, update, function(err) {
    callback(err);
  });
};

exports.removeTeamFromEvents = function(team, callback) {
  var update = {
    $pull: {teamIds: team._id}
  };
  Event.update({}, update, function(err) {
    callback(err);
  });
};

exports.updateUserInAcl = function(eventId, userId, role, callback) {
  // validate userId
  var err;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    err = new Error('Invalid userId');
    err.status = 400;
    return callback(err);
  }

  // validate role
  if (Object.keys(permissions).indexOf(role) === -1) {
    err = new Error('Invalid role');
    err.status = 400;
    return callback(err);
  }

  var update = {};
  update['acl.' + userId] = role;

  Event.findOneAndUpdate({_id: eventId}, update, {new: true, runValidators: true}, function(err, event) {
    if (err) return callback(err);

    // The team that belongs to this event should have the same acl as the event
    Team.updateUserInAclForEventTeam(eventId, userId, role, function(err) {
      callback(err, event);
    });
  });
};


exports.removeUserFromAcl = function(eventId, userId, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + userId] = true;

  Event.findByIdAndUpdate(eventId, update, {new: true, runValidators: true}, function(err, event) {
    if (err) return callback(err);

    // The team that belongs to this event should have the same acl as the event
    Team.removeUserFromAclForEventTeam(eventId, userId, function(err) {
      callback(err, event);
    });
  });
};

exports.removeUserFromAllAcls = function(user, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + user._id.toString()] = true;

  Event.update({}, update, {multi: true, new: true}, callback);
};

exports.remove = function(event, callback) {
  event.remove(function(err) {
    return callback(err);
  });
};
