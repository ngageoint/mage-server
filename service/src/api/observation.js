const async = require('async')
  , log = require('winston')
  , ObservationEvents = require('./events/observation.js')
  , FieldFactory = require('./field')
  , ObservationModel = require('../models/observation')
  , Attachment = require('./attachment');

const fieldFactory = new FieldFactory();

function Observation(event, user, deviceId) {
  this._event = event;
  this._user = user;
  this._deviceId = deviceId;
}

const EventEmitter = new ObservationEvents();
Observation.on = EventEmitter;

Observation.prototype.getAll = function(options, callback) {
  const event = this._event;
  const filter = options.filter;
  if (filter && filter.geometries) {
    let allObservations = [];
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

/**
 * TODO: this can be deleted when these refs go away
 * * routes/index.js
 */
Observation.prototype.getById = function(observationId, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  ObservationModel.getObservationById(this._event, observationId, options, callback);
};

Observation.prototype.addFavorite = function(observationId, user, callback) {
  ObservationModel.addFavorite(this._event, observationId, user, callback);
};

Observation.prototype.removeFavorite = function(observation, user, callback) {
  ObservationModel.removeFavorite(this._event, observation, user, callback);
};

Observation.prototype.addImportant = function(observationId, important, callback) {
  ObservationModel.addImportant(this._event, observationId, important, callback);
};

Observation.prototype.removeImportant = function(observation, callback) {
  ObservationModel.removeImportant(this._event, observation, callback);
};

Observation.prototype.addState = function(observationId, state, callback) {
  ObservationModel.addState(this._event, observationId, state, (err, state) => {
    if (!err) {
      if (state.name === 'archive') {
        EventEmitter.emit(ObservationEvents.events.remove, observationId, this._event);
      }
    }
    callback(err, state);
  });
};

module.exports = Observation;
