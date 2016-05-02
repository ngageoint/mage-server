var async = require('async')
  , FieldFactory = require('./field')
  , ObservationModel = require('../models/observation');

var fieldFactory = new FieldFactory();

function Observation(event) {
  this._event = event;
}

Observation.prototype.getAll = function(options, callback) {
  var event = this._event;
  var filter = options.filter;
  if (filter && filter.geometries) {
    var allObservations = [];
    async.each(
      filter.geometries,
      function(geometry, done) {
        options.filter.geometry = geometry;
        ObservationModel.getObservations(event, options, function (err, observations) {
          if (err) return done(err);

          if (observations) {
            allObservations = allObservations.concat(observations);
          }

          done();
        });
      },
      function(err) {
        callback(err, allObservations);
      }
    );
  } else {
    ObservationModel.getObservations(event, options, callback);
  }
};

Observation.prototype.getById = function(observationId, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  ObservationModel.getObservationById(this._event, observationId, options, callback);
};

Observation.prototype.validate = function(observation) {
  if (!observation.type || observation.type !== 'Feature' ) {
    throw new Error("cannot create observation 'type' param not specified, or is not set to 'Feature'");
  }

  if (!observation.geometry) {
    throw new Error("cannot create observation 'geometry' param not specified");
  }

  if (!observation.properties.timestamp) {
    throw new Error("cannot create observation 'properties.timestamp' param not specified");
  }

  if (!observation.properties.type) {
    throw new Error("cannot create observation 'properties.type' param not specified");
  }

  this._event.form.fields.forEach(function(fieldDefinition) {
    var field = fieldFactory.createField(fieldDefinition, observation);
    field.validate();
  });
};

Observation.prototype.create = function(observation, callback) {
  try {
    this.validate(observation);
  } catch (err) {
    err.status = 400;
    return callback(err);
  }

  ObservationModel.createObservation(this._event, observation, callback);
};

Observation.prototype.update = function(observationId, observation, callback) {
  ObservationModel.updateObservation(this._event, observationId, observation, callback);
};

Observation.prototype.addState = function(observationId, state, callback) {
  ObservationModel.addState(this._event, observationId, state, callback);
};

module.exports = Observation;
