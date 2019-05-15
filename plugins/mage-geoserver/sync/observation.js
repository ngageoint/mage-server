var async = require('async')
  , log = require('winston')
  , api = require('../../../api')
  , ObservationModel = require('../models/observation');

exports.sync = function(callback) {
  async.waterfall([
    getEvents,
    syncEvents
  ], function(err) {
    if (err) {
      log.error('Error syncing observations to geoserver.', err);
    }

    callback(err);
  });
};

function getEvents(callback) {
  new api.Event().getEvents(callback);
}

function syncEvents(events, callback) {
  async.eachSeries(events, function(event, done) {
    syncEvent(event, done);
  }, callback);
}

function syncEvent(event, callback) {
  log.info('Syncing event %s observations to geoserver', event.name);

  async.waterfall([
    function(done) {
      ObservationModel.getLastObservation(event, function(err, observation) {
        var lastModified = observation ? observation.lastModified : null;
        done(err, lastModified);
      });
    },
    function(lastModified, done) {
      syncObservations(event, lastModified, function(err) {
        done(err);
      });
    }
  ], function(err) {
    if (err) {
      log.error('Error syncing event %s observations to geoserver', event.name, err);
    }

    callback(err);
  });
}

function syncObservations(event, since, callback) {
  var options = {
    filter: {
      states: 'active'
    }
  };

  if (since) {
    options.filter.startDate = since;
  }

  new api.Observation(event).getAll(options, function(err, observations) {
    if (err) return callback(err);

    async.each(observations, function(observation, done) {
      syncObservation(observation.toObject(), event, done);
    }, callback);
  });
}

function syncObservation(observation, event, callback) {
  new api.User().getById(observation.userId, function(err, user) {
    if (err) return callback(err);

    ObservationModel.createObservation(observation, event, user, callback);
  });
}
