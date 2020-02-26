var async = require('async')
  , log = require('winston')
  , api = require('../../../api')
  , LocationModel = require('../models/location');

exports.sync = function(callback) {
  async.waterfall([
    getEvents,
    syncEvents
  ], function(err) {
    if (err) {
      log.error('Error syncing locations to geoserver.', err);
    }

    log.info('Completed location sync to geoserver');

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
  log.info('Syncing event %s locations to geoserver', event.name);

  async.waterfall([
    function(done) {
      LocationModel.getLastLocation(event, function(err, location) {
        var lastModified = location ? location.properties.timestamp : null;
        done(err, lastModified);
      });
    },
    function(lastModified, done) {
      // done();
      syncLocations(event, lastModified, function(err) {
        done(err);
      });
    }
  ], function(err) {
    if (err) {
      log.error('Error syncing event %s locations to geoserver', event.name, err);
    }

    log.info('Completed location sync for event %s', event.name);

    callback(err);
  });
}

function syncLocations(event, since, callback) {
  var options = {
    stream: true,
    filter: {
      eventId: event._id
    }
  };

  if (since) {
    log.info('Pulling locations for event %s, since %s', event.name, since.toISOString());
    options.filter.startDate = since;
  }

  var stream = new api.Location().getLocations(options);
  var error = null;

  stream.on('data', function(location) {
    stream.pause();
    syncLocation(location.toObject(), event, function(err) {
      if (err) {
        error = err;
      }

      stream.resume();
    });
  });

  stream.on('error', function(err) {
    return callback(err);
  });

  stream.on('end', function() {
    return callback(error);
  });
}

function syncLocation(location, event, callback) {
  new api.User().getById(location.userId, function(err, user) {
    if (err) return callback(err);

    LocationModel.createLocations(location, user, event, callback);
  });
}
