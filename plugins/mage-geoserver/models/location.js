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
    username: user.username,
    displayName: user.displayName
  };

  normalized.properties.event = {
    _id: event._id,
    name: event.name
  };

  return normalized;
};

exports.createLocations = function(locations, user, event) {
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
  });
};
