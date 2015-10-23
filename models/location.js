var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Creates the Schema for FFT Locations
var LocationSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, required: false, sparse: true, ref: 'User'},
  eventId: {type: Number, required: false, sparse: true, ref:'Event'},
  teamIds: [{type: Schema.Types.ObjectId}],
  type: { type: String, required: true },
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true}
  },
  properties: Schema.Types.Mixed
},{
    versionKey: false
});

LocationSchema.index({geometry: "2dsphere"});
LocationSchema.index({'properties.timestamp': 1});
LocationSchema.index({'properties.timestamp': 1, _id: 1});
LocationSchema.index({'userId': 1});
LocationSchema.index({'properties.user': 1, 'properties.timestamp': 1});

// Creates the Model for the User Schema
var Location = mongoose.model('Location', LocationSchema);
exports.Model = Location;

// create location
exports.createLocations = function(locations, callback) {
  Location.create(locations, callback);
}

exports.getLocations = function(options, callback) {
  var limit = 2000;
  if (options.limit && options.limit < 2000) {
    limit = options.limit;
  }

  var conditions = {};

  var filter = options.filter || {};
  if (filter.eventId) {
    conditions.eventId = filter.eventId;
  }

  if (filter.userId) {
    conditions.userId = filter.userId;
  }

  if (filter.lastLocationId && (filter.startDate || filter.endDate)) {
    conditions['$or'] = [{_id: {'$gt': filter.lastLocationId}}];
    if (filter.startDate) {
      conditions['$or'] = [{
        _id: {'$gt': filter.lastLocationId},
        'properties.timestamp': filter.startDate
      },{
        'properties.timestamp': {'$gt': filter.startDate}
      }];
    }

    if (filter.endDate) conditions['properties.timestamp'] = {'$lt': filter.endDate};
  } else if (filter.startDate || filter.endDate) {
    conditions['properties.timestamp'] = {};
    if (filter.startDate) conditions['properties.timestamp']['$gte'] = filter.startDate;
    if (filter.endDate) conditions['properties.timestamp']['$lt'] = filter.endDate;
  }

  Location.find(conditions, {}, {sort: {"properties.timestamp": 1, _id: 1}, limit: limit}, function (err, locations) {
    callback(err, locations);
  });
}

// update latest location
exports.updateLocation = function(user, timestamp, callback) {
  var conditions = {"userId": user._id};
  var update = {"properties.timestamp": timestamp};
  var options = {sort: {"properties.timestamp": -1}, new: true};
  Location.findOneAndUpdate(conditions, update, options, function(err, location) {
    callback(err, location);
  });
}

exports.removeLocationsForUser = function(user, callback) {
  var conditions = {"userId": user._id};
  Location.remove(conditions, function(err, numberRemoved) {
    callback(err);
  });
}
