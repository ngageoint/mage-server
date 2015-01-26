var mongoose = require('mongoose')
, Counter = require('./counter')
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
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String, required: false },
  collectionName: { type: String, required: true },
  teamIds: [{type: Schema.Types.ObjectId, ref: 'Team'}],
  form: {
    variantField: { type:String, required: false },
    fields: [FieldSchema]
  }
},{
  versionKey: false
});

var transform = function(event, ret, options) {
  if ('function' != typeof event.ownerDocument) {
    delete ret._id;
    delete ret.collectionName;

    ret.teams = ret.teamIds;
    delete ret.teamIds;
  }
}

EventSchema.set("toObject", {
  transform: transform
});

EventSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the Layer Schema
var Event = mongoose.model('Event', EventSchema);
exports.Model = Event;

exports.getEvents = function(filter, callback) {
  if (typeof filter == 'function') {
    callback = filter;
    filter = {};
  }

  var query = {};
  // var type = filter.type;
  // if (type) query.type = type;

  Event.find(query).populate('teamIds').exec(function (err, events) {
    if (err) {
      console.log("Error finding events in mongo: " + err);
    }

    callback(err, events);
  });
}

exports.getById = function(id, callback) {
  Event.findOne({id: id}).populate('teamIds').exec(function (err, event) {
    if (err) {
      console.log("Error finding event in mongo: " + err);
    }

    callback(err, event);
  });
}

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
    event.id = id;
    event.collectionName = 'observations' + id;

    if (event.teams) {
      event.teamIds = event.teams.map(function(team) { return mongoose.Types.ObjectId(team.id); });
    }

    Event.create(event, function(err, newEvent) {
      if (err) {
        console.log("Problem creating event. " + err);
        return callback(err);
      }

      createObservationCollection(newEvent);
      Event.populate(newEvent, {path: 'teamIds'}, callback);
    });
  });
}

exports.update = function(id, event, callback) {
  if (event.teams) {
    event.teamIds = event.teams.map(function(team) { return mongoose.Types.ObjectId(team.id); });
  }

  Event.findOneAndUpdate({id: id}, event, function(err, updatedEvent) {
    if (err) {
      console.log("Could not update event: " + err);
    }

    Event.populate(updatedEvent, {path: 'teamIds'}, callback);
  });
}

exports.remove = function(event, callback) {
  event.remove(function(err) {
    if (err) return callback(err);

    dropObservationCollection(event);

    new api.Icon(event.id).delete(function(err) {
      if (err) return callback(err);

      callback(err, event);
    });
  });
}
