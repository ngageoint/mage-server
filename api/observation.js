var ObservationModel = require('../models/observation')
  , async = require('async');
    
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

Observation.prototype.create = function(observation, callback) {
  ObservationModel.createObservation(this._event, observation, callback);
};

Observation.prototype.update = function(observationId, observation, callback) {
  ObservationModel.updateObservation(this._event, observationId, observation, callback);
};

Observation.prototype.addState = function(observationId, state, callback) {
  ObservationModel.addState(this._event, observationId, state, callback);
};

module.exports = Observation;
