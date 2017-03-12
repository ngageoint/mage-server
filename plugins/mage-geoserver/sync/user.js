var async = require('async')
  , log = require('winston')
  , api = require('../../../api')
  , UserModel = require('../models/user');

exports.sync = function(callback) {
  async.waterfall([
    getEvents,
    syncEvents
  ], function(err) {
    if (err) {
      log.error('Error syncing users to geoserver.', err);
    }

    callback(err);
  });
};

function getEvents(callback) {
  new api.Event().getEvents(callback);
}

function syncEvents(events, callback) {
  async.eachSeries(events, function(event) {
    syncEvent(event, callback);
  });
}

function syncEvent(event, callback) {
  log.info('Syncing event %s users to geoserver', event.name);

  var options = {
    groupByUser: true,
    filter: {
      eventId: event._id
    }
  };

  new api.Location().getLocations(options, function(err, users) {
    async.each(users, function(user, done) {
      syncUser(user, event, done);
    }, function(err) {
      callback(err);
    });
  });
}

function syncUser(userLocations, event, callback) {
  new api.User().getById(userLocations.id, function(err, user) {
    if (err) return callback(err);

    UserModel.createLocations(userLocations.locations, user, event, callback);
  });
}
