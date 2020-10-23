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
  log.info('Syncing users for events', events.length);

  async.eachSeries(events, function(event, done) {
    syncEvent(event, done);
  }, callback);
}

function syncEvent(event, callback) {
  log.info('Syncing event %s users to geoserver', event.name);

  var options = {
    groupByUser: true,
    filter: {
      eventId: event._id
    },
    limit: 1
  };

  new api.Location().getLocations(options, function(err, users) {
    async.each(users, function(user, done) {
      syncUser(user, event, done);
    }, callback);
  });
}

function syncUser(userLocations, event, callback) {
  new api.User().getById(userLocations.userId, function(err, user) {
    if (err) return callback(err);

    UserModel.createLocations(userLocations.locations, user, event, callback);
  });
}
