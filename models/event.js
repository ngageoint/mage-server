var mongoose = require('mongoose')
, Counter = require('./counter');

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
  form: {
    variantField: { type:String, required: false },
    fields: [FieldSchema]
  }
},{
  versionKey: false
});

var transform = function(event, ret, options) {
  delete ret._id;
  delete ret.collectionName;
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

  Event.find(query, function (err, events) {
    if (err) {
      console.log("Error finding events in mongo: " + err);
    }

    callback(err, events);
  });
}

exports.getById = function(id, callback) {
  Event.findOne({id: id}, function (err, event) {
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

    Event.create(event, function(err, newEvent) {
      if (err) {
        console.log("Problem creating event. " + err);
        return callback(err);
      }

      createObservationCollection(newEvent);
      callback(err, newEvent);
    });
  });
}

exports.update = function(id, event, callback) {
  console.log('update id ' + id + ' with ', JSON.stringify(event));
  Event.findOneAndUpdate({id: id}, event, function(err, updatedEvent) {
    if (err) {
      console.log("Could not update event: " + err);
    }

    callback(err, updatedEvent);
  });
}

exports.remove = function(event, callback) {
  event.remove(function(err) {
    if (err) {
      console.error(err);
    } else {
      dropObservationCollection(event);
    }

    callback(err, event);
  });
}

exports.getForm = function(event, callback) {
  event.findOneById({id: event.id}, function(err) {
    if (err) {
      console.log("Could not get form for event: " + err);
    }

    callback(err, event.form);
  });
}
