const mongoose = require('mongoose')
  , log = require('winston')
  , config = require('../config.json');

const Schema = mongoose.Schema;

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
ObservationSchema.index({'event.name': 1});
ObservationSchema.index({'user.username': 1});
ObservationSchema.index({'user.displayName': 1});
ObservationSchema.index({'device.uid': 1});
ObservationSchema.index({'properties.type': 1});
ObservationSchema.index({'properties.timestamp': 1});
ObservationSchema.index({'properties.event._id': 1});

var ObservationModel = mongoose.model('Observation', ObservationSchema);

function createOrUpdateObservation(observation, event, user, callback) {
  observation.properties.url = `${config.mage.baseUrl}/${config.context}/events/${event._id}/observations/${observation.id}?access_token=${config.token}`;

  observation.properties.event = {
    _id: event._id,
    name: event.name,
    description: event.description
  };

  if (user) {
    observation.properties.user = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName
    };
  }

  const forms = observation.properties.forms;
  observation.properties.forms = {};
  forms.forEach(form => {
    observation.properties.forms[form.formId] = form;
    observation.properties.formId = form.formId;
  });

  const options = {
    upsert: true,
    new: true
  };

  ObservationModel.findOneAndUpdate({_id: observation.id, 'properties.event._id': event._id}, observation, options, function(err, observation) {
    if (err) {
      log.error('Error creating observation', err);
    }

    if (callback) {
      callback(err, observation);
    }
  });
}

exports.createObservation = createOrUpdateObservation;
exports.updateObservation = createOrUpdateObservation;

exports.removeObservation = function(observationId, event) {
  ObservationModel.findOneAndRemove({_id: observationId, 'properties.event._id': event._id}, function(err) {
    if (err) {
      log.error('Error removing observation', err);
    }
  });
};

exports.removeObservations = function(event, callback) {
  ObservationModel.remove({'properties.event._id': event._id}, function(err) {
    if (callback) {
      callback(err);
    }
  });
};

exports.getLastObservation = function(event, callback) {

  ObservationModel.find({'properties.event._id': event._id}, {}, {limit: 1, sort: {lastModified: -1}}, function(err, observations) {
    if (err) return callback(err);

    const observation = observations.length ? observations[0] : null;
    callback(err, observation);
  });
};
