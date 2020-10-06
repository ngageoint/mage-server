const mongoose = require('mongoose')
  , config = require('../config.js')
  , Location = require('./location');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;
const locationLimit = config.server.locationServices.userCollectionLocationLimit;

// Creates the Schema for FFT Locations
const CappedLocationSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, required: false, sparse: true, ref: 'User'},
  eventId: {type: Number, required: false, sparse: true, ref:'Event'},
  locations: [Location.Model.schema]
},{
  versionKey: false
});

// TODO: this seems superfluous - probably remove because there's already an index on eventId in the field definition
CappedLocationSchema.index({'eventId': 1});
// TODO: this seems superflous because there's already an index on properties.timestamp in LocationSchema. do child-schema indexes get created on parent collections?
CappedLocationSchema.index({'locations.properties.timestamp': 1});
CappedLocationSchema.index({'locations.properties.timestamp': 1, 'eventId': 1});

const transform = function (userLocation, ret) {
  if ('function' !== typeof userLocation.ownerDocument) {
    if (userLocation.populated('userId')) {
      ret.user = userLocation.userId.toObject();
      delete ret.user.icon;
    }

    delete ret._id;
    ret.id = ret.user ? ret.user.id : userLocation.userId;
    ret.locations = (userLocation.locations || []).reverse();
  }
}

CappedLocationSchema.set("toJSON", {
  transform: transform
});

CappedLocationSchema.set("toObject", {
  transform: transform
});

// Creates the Model for the User Schema
const CappedLocation = mongoose.model('CappedLocation', CappedLocationSchema);
exports.Model = CappedLocation;

exports.addLocations = function(user, event, locations, callback) {
  const update = {
    $push: {
      locations: {$each: locations, $sort: {"properties.timestamp": 1}, $slice: -1 * locationLimit}
    }
  };

  CappedLocation.findOneAndUpdate({userId: user._id, eventId: event._id}, update, {upsert: true, new: true}, function(err, user) {
    callback(err, user);
  });
};

exports.getLocations = function(options, callback) {
  let limit = options.limit;
  limit = limit <= locationLimit ? limit : locationLimit;

  const filter = options.filter;

  const parameters = {};
  if (filter.eventId) parameters.eventId = filter.eventId;

  const query = CappedLocation.find(parameters, {userId: 1, locations: {$slice: -1 * limit}});

  // TODO take out where
  if (filter.startDate) {
    query.where('locations.properties.timestamp').gte(filter.startDate);
  }

  if (filter.endDate) {
    query.where('locations.properties.timestamp').lt(filter.endDate);
  }

  if (options.populate) {
    query.populate({
      path: 'userId',
      select: 'icon displayName email phones'
    })
  }

  query.exec(callback);
};

exports.removeLocationsForUser = function(user, callback) {
  const conditions = {"userId": user._id};
  CappedLocation.remove(conditions, function(err) {
    callback(err);
  });
};
