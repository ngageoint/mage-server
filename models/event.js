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

function hasAtLeastOneField(fields) {
  return fields.length > 0;
}

function validateColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

var FormSchema = new Schema({
  _id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: false },
  color: {type: String, required: true},
  archived: {type: Boolean, required: true, default: false},
  primaryField: { type: String, required: false },
  variantField: { type: String, required: false },
  userFields: [String],
  fields: [FieldSchema],
  style: { type: Schema.Types.Mixed, required: false }
});

// Creates the Schema for the Attachments object
var EventSchema = new Schema({
  _id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String, required: false },
  complete: { type: Boolean },
  collectionName: { type: String, required: true },
  teamIds: [{type: Schema.Types.ObjectId, ref: 'Team'}],
  layerIds: [{type: Number, ref: 'Layer'}],
  forms: [FormSchema],
  style: {
    type: Schema.Types.Mixed,
    required: true,
    default: {
      fill: '#5278A2',
      stroke: '#5278A2',
      fillOpacity: 0.2,
      strokeOpacity: 1,
      strokeWidth: 2
    }
  }
},{
  versionKey: false
});

// TODO figure out how to validate multiple forms
// TODO validate form color is a hex color
// TODO validate form has at least one field
FormSchema.path('fields').validate(hasAtLeastOneField, 'Form must have at least one field.');
FormSchema.path('color').validate(validateColor, 'Form color must be valid hex string.');

// EventSchema.path('form.fields').validate(hasFieldOnce('type'), 'fields array must contain one type field');
// EventSchema.path('form.fields').validate(fieldIsRequired('type'), 'type must have a required property set to true.');

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
  Team.getTeams({teamIds: event.teamIds}, function(err, teams) {
    if (err) log.error('Could not get teams for deleted event ' + event.name);

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

function transformForm(form, ret) {
  ret.id = ret._id;
  delete ret._id;
}

function transform(event, ret) {
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
  }
}

FormSchema.set("toJSON", {
  transform: transformForm
});

EventSchema.set("toJSON", {
  transform: transform
});

EventSchema.set("toObject", {
  transform: transform
});

// Creates the Model for the Layer Schema
var Event = mongoose.model('Event', EventSchema);
exports.Model = Event;

function filterEventsByUserId(events, userId, callback) {
  Event.populate(events, 'teamIds', function(err, events) {
    if (err) return callback(err);

    var filteredEvents = events.filter(function(event) {
      return event.teamIds.some(function(team) {
        return team.userIds.indexOf(userId) !== -1;
      });
    });

    callback(null, filteredEvents);
  });
}

function eventHasUser(event, userId, callback) {
  getTeamsForEvent(event, function(err, teams) {
    if (err) return callback(err);

    var userInEvent = teams.some(function(team) {
      return team.userIds.indexOf(userId) !== -1;
    });

    callback(null, userInEvent);
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

exports.count = function(callback) {
  Event.count({}, function(err, count) {
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
    if (options.access && options.access.userId) {
      filters.push(function(done) {
        filterEventsByUserId(events, options.access.userId, function(err, filteredEvents) {
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
    if (err) return callback(err);

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
        callback(null, event);
      }
    });
  });
};

// TODO probably should live in event api
exports.filterEventsByUserId = filterEventsByUserId;
exports.eventHasUser = eventHasUser;

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

exports.create = function(event, options, callback) {
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
      Event.create(event, function(err, newEvent) {
        if (err) return done(err);

        createObservationCollection(newEvent);

        done(null, newEvent);
      });
    },
    function(event, done) {
      Team.createTeamForEvent(event, function(err) {
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

  async.series([
    function(done) {
      validateTeamIds(id, event.teamIds, done);
    },
    function(done) {
      // Preserve form ids
      event.forms.forEach(function(form) {
        form._id = form.id;
      });

      Event.findByIdAndUpdate(id, event, {new: true, runValidators: true, context: 'query'}, done);
    }
  ], function(err, results) {
    if (err) return callback(err);

    var updatedEvent = results[1];

    if (options.populate) {
      Event.populate(updatedEvent, {path: 'teamIds'}, function(err, event) {
        Event.populate(event, {path: 'teamIds.userIds', model: 'User'}, callback);
      });
    } else {
      callback(err, updatedEvent);
    }
  });
};

exports.addForm = function(eventId, form, callback) {
  Counter.getNext('form', function(id) {
    form._id = id;

    var update = {
      $push: {forms: form}
    };

    Event.findByIdAndUpdate(eventId, update, {new: true, runValidators: true}, function(err, event) {
      if (err) return callback(err);

      var forms = event.forms.filter(function(f) {
        return f._id === form._id;
      });

      callback(err, forms.length ? forms[0] : null);
    });
  });
};

exports.updateForm = function(event, form, callback) {
  var update = {
    $set: {
      'forms.$': form
    }
  };

  Event.findOneAndUpdate({'forms._id': form._id}, update, {new: true, runValidators: true}, function(err, event) {
    var forms = event.forms.filter(function(f) {
      return f._id === form._id;
    });

    callback(err, forms.length ? forms[0] : null);
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

exports.remove = function(event, callback) {
  event.remove(function(err) {
    return callback(err);
  });
};
