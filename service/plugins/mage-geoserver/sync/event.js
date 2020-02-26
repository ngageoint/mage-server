var async = require('async')
  , log = require('winston')
  , api = require('../../../api')
  , GeoServerObservation = require('../geoserver/observation')
  , GeoServerLocation = require('../geoserver/location')
  , GeoServerUser = require('../geoserver/user');

exports.sync = function(callback) {
  async.waterfall([
    getEvents,
    createEvents
  ], function(err) {
    if (err) {
      log.error('Error creating geoserver observations layers.', err);
    }

    callback(err);
  });
};

function getEvents(callback) {
  new api.Event().getEvents(callback);
}

function createEvents(events, callback) {
  async.eachSeries(events, function(event, done) {
    createEvent(event, done);
  }, callback);
}

function createEvent(event, callback) {
  log.info('Creating geoserver observation and location layers for event %s.', event.name);
  async.series([
    function(done) {
      GeoServerObservation.createLayer(event, done);
    },
    function(done) {
      GeoServerLocation.createLayer(event, done);
    },
    function(done) {
      GeoServerUser.createLayer(event, done);
    }
  ], function(err) {
    callback(err);
  });
}
