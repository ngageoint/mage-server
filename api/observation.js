var async = require('async')
  , ObservationEvents = require('./events/observation.js')
  , FieldFactory = require('./field')
  , ObservationModel = require('../models/observation');

var fieldFactory = new FieldFactory();

function Observation(event, user, deviceId) {
  this._event = event;
  this._user = user;
  this._deviceId = deviceId;
}

var EventEmitter = new ObservationEvents();
Observation.on = EventEmitter;

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
    type: 'date',
    required: true,
    name: 'timestamp',
    title: 'timestamp'
  }, observation.properties);
  timestampField.validate();

  var geometryField = fieldFactory.createField({
    type: 'geometry',
    required: true,
    name: 'geometry',
    title: 'geometry'
  }, observation);
  geometryField.validate();

  // validate form fields
  var formMap = {};
  this._event.forms.forEach(function(form) {
    formMap[form._id] = form;
  });

  var forms = observation.properties.forms || [];
  forms.forEach(function(observationForm) {
    formMap[observationForm.formId].fields.filter(function(fieldDefinition) {
      // Don't validate archived fields
      return !fieldDefinition.archived;
    }).forEach(function(fieldDefinition) {
      var field = fieldFactory.createField(fieldDefinition, observationForm);
      field.validate();
    });
  });
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

// TODO create is gone, do I need to figure out if this is an observation create?
Observation.prototype.update = function(observationId, observation, callback) {
  if (this._user) observation.userId = this._user._id;
  if (this._deviceId) observation.deviceId = this._deviceId;

  try {
    this.validate(observation);
  } catch (err) {
    err.status = 400;
    return callback(err);
  }

  var self = this;
  ObservationModel.updateObservation(this._event, observationId, observation, function(err, observation) {
    if (observation) {
      EventEmitter.emit(ObservationEvents.events.update, observation.toObject(), self._event, self._user);
    }

    callback(err, observation);
  });
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
  var self = this;

  ObservationModel.addState(this._event, observationId, state, function(err, state) {
    if (!err) {
      if (state.name === 'archive') {
        EventEmitter.emit(ObservationEvents.events.remove, observationId, self._event);
      }
    }

    callback(err, state);
  });
};

module.exports = Observation;
