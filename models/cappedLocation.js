var mongoose = require('mongoose')
  , config = require('../config.js');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;
var LocationSchema = mongoose.model('Location').schema;
var locationLimit = config.server.locationServices.userCollectionLocationLimit;

// Creates the Schema for FFT Locations
var CappedLocationSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, required: false, sparse: true, ref: 'User'},
  eventId: {type: Number, required: false, sparse: true, ref:'Event'},
  locations: [LocationSchema]
},{
  versionKey: false
});

CappedLocationSchema.index({'eventId': 1});
CappedLocationSchema.index({'locations.properties.timestamp': 1});
CappedLocationSchema.index({'locations.properties.timestamp': 1, 'eventId': 1});

// Creates the Model for the User Schema
var CappedLocation = mongoose.model('CappedLocation', CappedLocationSchema);
exports.Model = CappedLocation;

exports.addLocations = function(user, event, locations, callback) {
  var update = {
    $push: {
      locations: {$each: locations, $sort: {"properties.timestamp": 1}, $slice: -1 * locationLimit}
    }
  };

  CappedLocation.findOneAndUpdate({userId: user._id, eventId: event._id}, update, {upsert: true, new: true}, function(err, user) {
    callback(err, user);
  });
};

exports.getLocations = function(options, callback) {
  var limit = options.limit;
  limit = limit <= locationLimit ? limit : locationLimit;
  var filter = options.filter;

  var parameters = {};
  if (filter.eventId) parameters.eventId = filter.eventId;

  var query = CappedLocation.find(parameters, {userId: 1, locations: {$slice: -1 * limit}});

  // TODO take out where
  if (filter.startDate) {
    query.where('locations.properties.timestamp').gte(filter.startDate);
  }

  if (filter.endDate) {
    query.where('locations.properties.timestamp').lt(filter.endDate);
  }

  query.lean().exec(function (err, users) {
    if (err) return callback(err);

    users = users.map(function(user) {
      return {
        id: user.userId,
        locations: user.locations ? user.locations.reverse() : []
      };
    });

    callback(err, users);
  });
};

exports.removeLocationsForUser = function(user, callback) {
  var conditions = {"userId": user._id};
  CappedLocation.remove(conditions, function(err) {
    callback(err);
  });
};
