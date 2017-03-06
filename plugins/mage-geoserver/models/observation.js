var mongoose = require('mongoose')
  , log = require('winston')
  , util = require('util');

var Schema = mongoose.Schema;

// TODO Attachments
// Not sure what to do here to secure attachment URLs
// since GeoServer is accessing the DB directly.
// Also not sure how to handle an array of attachments, might need to
// flatten the array

var ObservationSchema = new Schema({
  type: {type: String, required: true},
  lastModified: {type: Date, required: false},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed
});

ObservationSchema.index({geometry: "2dsphere"});
ObservationSchema.index({'lastModified': 1});
ObservationSchema.index({'attachments.lastModified': 1});
ObservationSchema.index({'event.name': 1});
ObservationSchema.index({'user.username': 1});
ObservationSchema.index({'user.displayName': 1});
ObservationSchema.index({'device.uid': 1});
ObservationSchema.index({'properties.type': 1});
ObservationSchema.index({'properties.timestamp': 1});

function observationModel(event) {
  var name = util.format('observations%d', event._id);
  try {
    var model = mongoose.model(name);
  } catch(e) {
    model = mongoose.model(name, ObservationSchema, name);
  }

  return model;
}

function mapPropertyNameToTitle(properties, form) {
  properties = properties || {};

  var fieldNameToField = {};
  form.fields.forEach(function(field) {
    fieldNameToField[field.name] = field;
  });

  for (var name in properties) {
    if (name === 'type') continue;

    var field = fieldNameToField[name];
    if (field) {
      if (field.archived) {
        delete properties[field.title];
      } else {
        properties[field.title] = properties[name];
      }

      delete properties[name];
    }
  }
}

function createOrUpdateObservation(observation, event, user) {
  mapPropertyNameToTitle(observation.properties, event.form);

  observation.properties.event = {
    _id: event._id,
    name: event.name,
    description: event.description
  };

  observation.properties.user = {
    _id: user._id,
    username: user.username,
    displayName: user.displayName
  };

  var options = {
    upsert: true,
    new: true
  };

  observationModel(event).findOneAndUpdate({_id: observation.id}, observation, options, function(err) {
    if (err) {
      log.error('Error creating observation', err);
    }
  });
}

function removeObservation(observationId, event) {
  observationModel(event).findByIdAndRemove(observationId, function(err) {
    if (err) {
      log.error('Error removing observation', err);
    }
  });
}

function createCollection(event, callback) {
  var model = observationModel(event);
  model.on('index', function() {
    callback();
  });
}

function removeCollection(event, callback) {
  observationModel(event).collection.drop(callback);
}

exports.createCollection = createCollection;
exports.removeCollection = removeCollection;
exports.createObservation = createOrUpdateObservation;
exports.updateObservation = createOrUpdateObservation;
exports.removeObservation = removeObservation;
