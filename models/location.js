var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Creates the Schema for FFT Locations
var LocationSchema = new Schema({
  type: { type: String, required: true },
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true}
  },
  properties: Schema.Types.Mixed
},{
    versionKey: false
});

// TODO when user is removed need to remove thier locations.

LocationSchema.index({geometry: "2dsphere"});
LocationSchema.index({'properties.timestamp': 1});
LocationSchema.index({'properties.user': 1, 'properties.timestamp': 1});

// Creates the Model for the User Schema
var Location = mongoose.model('Location', LocationSchema);
exports.Model = Location;

// create location
exports.createLocations = function(user, locations, callback) {
  Location.create(locations, function(err) {
    if (err) {
      console.log('Error creating new location for user: ' + user.username + '.  Err:' + err);
    }

    callback(err, Array.prototype.slice.call(arguments, 1));
  });
}

exports.getAllLocations = function(options, callback) {
  var limit = 2000;
  if (options.limit && options.limit < 2000) {
    limit = options.limit;
  }
  var filter = options.filter

  var query = {};

  var timeFilter = {};
  if (filter && filter.startDate) {
    timeFilter["$gte"] = filter.startDate;
  }
  if (filter && filter.endDate) {
    timeFilter["$lt"] = filter.endDate;
  }
  if (filter.startDate || filter.endDate) query["properties.timestamp"] = timeFilter;

  Location.find(query, {}, {sort: {"properties.timestamp": 1}, limit: limit}, function (err, locations) {
    if (err) {
      console.log("Error finding locations", err);
    }

    callback(err, locations);
  });
}

// get locations for users (filters for)
exports.getLocations = function(options, callback) {
  var limit = options.limit || 1000;
  var filter = options.filter;

  var timeFilter = {};
  if (filter.startDate) {
    timeFilter["$gte"] = filter.startDate;
  }

  if (filter.endDate) {
    timeFilter["$lt"] = filter.endDate;
  }

  var match = (filter.startDate || filter.endDate) ? { $match: {'properties.timestamp': timeFilter}} : { $match: {}};
  var sort = { $sort: { "properties.timestamp": 1 } };
  var limit = { $limit: limit };
  var group = { $group: { _id: "$properties.user", locations: { $push: {_id: "$_id", type: "$type", geometry: "$geometry", properties: "$properties"} }}};
  var project = { $project: { _id: 0, user: "$_id", locations: "$locations"} };

  Location.aggregate(match, sort, limit, group, project, function(err, aggregate) {
    callback(err, aggregate);
  });
}

// update latest location
exports.updateLocation = function(user, timestamp, callback) {
  var conditions = {"properties.user": user._id};
  var update = {"properties.timestamp": timestamp};
  var options = {sort: {"properties.timestamp": -1}};
  Location.findOneAndUpdate(conditions, update, options, function(err, location) {
    if (err) {
      console.log("Error updating date on latesest location for user : " + user.username + ". Error: " + err);
    }

    console.log("updated location: " + JSON.stringify(location));

    callback(err, location);
  });
}

exports.removeLocationsForUser = function(user, callback) {
  var conditions = {"properties.user": user._id};
  Location.remove(conditions, function(err, numberRemoved) {
    if (err) {
      console.log("Error removing locaitons for user: " + user.username);
    }

    callback(err);
  });
}
