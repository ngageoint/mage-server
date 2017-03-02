var async = require('async')
  , LocationEvents = require('./events/location.js')
  , LocationModel = require('../models/location')
  , CappedLocationModel = require('../models/cappedLocation');

function Location() {
}

var EventEmitter = new LocationEvents();
Location.on = EventEmitter;

function getLocations(options, callback) {
  LocationModel.getLocations(options, callback);
}

function getLocationsGroupedByUser(options, callback) {
  CappedLocationModel.getLocations(options, callback);
}

Location.prototype.getLocations = function(options, callback) {
  if (options.groupByUser) {
    getLocationsGroupedByUser(options, callback);
  } else {
    getLocations(options, callback);
  }
};

Location.prototype.createLocations = function(locations, user, event, callback) {
  async.parallel({
    locations: function(done) {
      LocationModel.createLocations(locations, function(err, locations) {
        done(err, locations);
      });
    },
    cappedLocations: function(done) {
      CappedLocationModel.addLocations(user, event, locations, function(err) {
        done(err);
      });
    }
  }, function(err, results) {
    if (!err) {
      EventEmitter.emit(LocationEvents.events.add, results.locations, user, event);
    }

    callback(err, results.locations);
  });
};

module.exports = Location;
