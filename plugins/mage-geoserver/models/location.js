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

var normalizeLocation = function(locations, user, event) {
  if (!Array.isArray(locations)) {
    locations = [locations];
  }

  locations.forEach(function(location) {
    location.properties.username = user.username;
    location.properties.displayName = user.displayName;

    location.properties.eventId = event._id;
    location.properties.eventName = event.name;
  });
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
    normalizeLocation(location, user, event);

    LocationModel.findByIdAndUpdate({_id: location._id}, location, options, function(err) {
      done(err);
    });
  }, function(err) {
    if (err) {
      log.error('Error creating locations', err);
    }
  });
};
