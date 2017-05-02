var async = require('async')
  , mongoose = require('mongoose')
  , log = require('winston');

var Schema = mongoose.Schema;

var LocationSchema = new Schema({
  type: {type: String, required: true},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed
});

LocationSchema.index({geometry: "2dsphere"});
LocationSchema.index({'properties.eventId': 1});
LocationSchema.index({'properties.username': 1});
LocationSchema.index({'properties.displayName': 1});
LocationSchema.index({'properties.timestamp': 1});

var LocationModel = mongoose.model('Location', LocationSchema);

var normalizeLocation = function(location, user, event) {

  var normalized = {
    type: location.type,
    geometry: {
      type: location.geometry.type,
      coordinates: location.geometry.coordinates
    },
    properties: location.properties
  };

  normalized.properties.user = {
    _id: user._id,
    username: user.username,
    displayName: user.displayName
  };

  if (user.email) {
    normalized.properties.user.email = user.email;
  }

  user.phones.forEach(function(phone) {
    normalized.properties.user.phone = phone.number;
  });

  normalized.properties.event = {
    _id: event._id,
    name: event.name
  };

  return normalized;
};

exports.createLocations = function(locations, user, event, callback) {
  if (!Array.isArray(locations)) {
    locations = [locations];
  }

  var options= {
    upsert: true,
    new: true
  };

  async.each(locations, function(location, done) {
    var normalized = normalizeLocation(location, user, event);

    LocationModel.findByIdAndUpdate({_id: location._id}, normalized, options, function(err) {
      done(err);
    });
  }, function(err) {
    if (err) {
      log.error('Error creating locations', err);
    }

    if (callback) {
      callback(err);
    }
  });
};

exports.removeLocations = function(event, callback) {
  LocationModel.remove({'properties.event._id': event._id}, function(err) {
    if (callback) {
      callback(err);
    }
  });
};

exports.getLastLocation = function(event, callback) {

  LocationModel.find({'properties.event._id': event._id},{}, {limit: 1, sort: {'properties.timestamp': -1}}, function(err, locations) {
    if (err) return callback(err);

    var location = locations.length ? locations[0] : null;
    callback(err, location);
  });
};
