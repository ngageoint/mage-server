var mongoose = require('mongoose')
, async = require('async')
, Counter = require('./counter')
, Team = require('./team')
, api = require('../api');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

var OptionSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  value: { type: Number, required: true }
},{
  _id: false
});

var FieldSchema = new Schema({
  id: { type: Number, required: true },
  archived: { type: Boolean, required: false},
  title: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: false },
  name: { type: String, required: true },
  required: { type: Boolean, required: true },
  choices: [OptionSchema]
},{
  _id: false
});

// Creates the Schema for the Attachments object
var EventSchema = new Schema({
  _id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String, required: false },
  collectionName: { type: String, required: true },
  teamIds: [{type: Schema.Types.ObjectId, ref: 'Team'}],
  layerIds: [{type: Number, ref: 'Layer'}],
  form: {
    variantField: { type:String, required: false },
    fields: [FieldSchema]
  }
},{
  versionKey: false
});

function transform(event, ret, options) {
  if ('function' != typeof event.ownerDocument) {
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

exports.getEvents = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  Event.find({}, function (err, events) {
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

      if (options.populate === false) {
        callback(null, events);
      } else {
        Event.populate(events, [{path: 'teamIds'}, {path: 'layerIds'}], function(err, events) {
          callback(err, events);
        });
      }
    });
  });
}

exports.getById = function(id, options, callback) {
  if (typeof options == 'function') {
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

      if (options.populate === false) {
        callback(null, event);
      } else {
        event.populate([{path: 'teamIds'}, {path: 'layerIds'}], function(err, events) {
          callback(err, events);
        });
      }
    });
  });
}

// TODO probably should live in event api
exports.filterEventsByUserId = filterEventsByUserId;
exports.eventHasUser = eventHasUser;

var createObservationCollection = function(event) {
  console.log("Creating observation collection: " + event.collectionName + ' for event ' + event.name);
  mongoose.connection.db.createCollection(event.collectionName, function(err, collection) {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Successfully created observation collection for event " + event.name);
  });
}

var dropObservationCollection = function(event) {
  console.log("Dropping observation collection: " + event.collectionName);
  mongoose.connection.db.dropCollection(event.collectionName, function(err, results) {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Dropped observation collection ' + event.collectionName);
  });
}

exports.create = function(event, callback) {
  Counter.getNext('event', function(id) {
    event._id = id;
    event.collectionName = 'observations' + id;

    Event.create(event, function(err, newEvent) {
      if (err) return callback(err);

      createObservationCollection(newEvent);
      Event.populate(newEvent, {path: 'teamIds'}, function(err, event) {
        Event.populate(event, {path: 'teamIds.userIds', model: 'User'}, callback);
      });
    });
  });
}

exports.update = function(id, event, callback) {
  Event.findByIdAndUpdate(id, event, function(err, updatedEvent) {
    if (err) {
      console.log("Could not update event: " + err);
    }

    Event.populate(updatedEvent, {path: 'teamIds'}, function(err, event) {
      Event.populate(event, {path: 'teamIds.userIds', model: 'User'}, callback);
    });
  });
}

exports.removeLayerFromEvents = function(layer, callback) {
  var update = {
    $pull: {layerIds: layer._id}
  };
  Event.update({}, update, function(err, numberAffected) {
    callback(err);
  });
}

exports.removeTeamFromEvents = function(team, callback) {
  var update = {
    $pull: {teamIds: team._id}
  };
  Event.update({}, update, function(err, numberAffected) {
    callback(err);
  });
}

exports.remove = function(event, callback) {
  event.remove(function(err) {
    if (err) return callback(err);

    dropObservationCollection(event);

    new api.Icon(event._id).delete(function(err) {
      if (err) return callback(err);

      callback(err, event);
    });
  });
}
