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
    throw new Error("'geometry' param required but not specified");
  }

  if (!observation.properties.timestamp) {
    throw new Error("'properties.timestamp' param required but not specified");
  }

  // validate timestamp
  var timestampField = fieldFactory.createField({
    type: "date",
    required: true,
    name: "timestamp",
  }, observation.properties);
  timestampField.validate();

  var geometryField = fieldFactory.createField({
    type: "geometry",
    required: true,
    name: "geometry",
  }, observation);
  geometryField.validate();

  // validate form fields
  var formMap = {};
  this._event.forms.forEach(function(form) {
    formMap[form._id] = form;
  });

  observation.properties.forms.forEach(function(observationForm) {
    formMap[observationForm.formId].fields.filter(function(fieldDefinition) {
      // Don't validate archived fields
      return !fieldDefinition.archived;
    }).forEach(function(fieldDefinition) {
      var field = fieldFactory.createField(fieldDefinition, observationForm);
      field.validate();
    });
  });
};

// DEPRECATED backwards compat for creating an observation.  Will be removed in version 5.x.x
Observation.prototype.create = function(observation, callback) {
  try {
    this.validate(observation);
  } catch (err) {
    err.status = 400;
    return callback(err);
  }

  ObservationModel.createObservation(this._event, observation, callback);
};

Observation.prototype.createObservationId = function(callback) {
  ObservationModel.createObservationId(callback);
};

Observation.prototype.validateObservationId = function(id, callback) {
  ObservationModel.getObservationId(id, function(err, id) {
    if (err) return callback(err);

    if (!id) {
      err = new Error();
      err.status = 404;
    }

    callback(err, id);
  });
};

Observation.prototype.update = function(observationId, observation, callback) {
  try {
    this.validate(observation);
  } catch (err) {
    err.status = 400;
    return callback(err);
  }

  ObservationModel.updateObservation(this._event, observationId, observation, callback);
};

Observation.prototype.addFavorite = function(observationId, user, callback) {
  ObservationModel.addFavorite(this._event, observationId, user, callback);
};

Observation.prototype.removeFavorite = function(observation, user, callback) {
  ObservationModel.removeFavorite(this._event, observation, user, callback);
};

Observation.prototype.addImportant = function(observationId, important, callback) {
  ObservationModel.updateObservation(this._event, observationId, {important: important}, callback);
};

Observation.prototype.removeImportant = function(observation, callback) {
  ObservationModel.removeImportant(this._event, observation, callback);
};

Observation.prototype.addState = function(observationId, state, callback) {
  ObservationModel.addState(this._event, observationId, state, callback);
};

module.exports = Observation;
