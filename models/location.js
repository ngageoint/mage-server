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
 
// create location
exports.createLocations = function(user, locations, callback) {
  Location.create(locations, function(err) {
    if (err) {
      console.log('Error creating new location for user: ' + user.username + '.  Err:' + err);
    }

    callback(err, Array.prototype.slice.call(arguments, 1));
  });  
}

// get locations for users team
exports.getLocations = function(user, limit, callback) {
  var sort = { $sort: { "properties.timestamp": -1 }};
  var limit = { $limit: limit };
  var group = { $group: { _id: "$properties.user", locations: { $push: {location: {geometry: "$geometry", properties: "$properties"} } }}};
  var project = { $project: { _id: 0, user: "$_id", locations: "$locations"} };
  Location.aggregate(sort, limit, group, project, function(err, aggregate) {
    callback(err, aggregate);
  });
}

// get locations for users (filters for)
exports.getLocationsWithFilters = function(user, filter, limit, callback) {
  
  var timeFilter = {};
  if (filter.startDate) {
    timeFilter["$gte"] = filter.startDate;
  }

  if (filter.endDate) {
    timeFilter["$lt"] = filter.endDate;
  }

  var match = (filter.startDate || filter.endDate) ? { $match: {'properties.timestamp': timeFilter}} : { $match: {}};
  var sort = { $sort: { "properties.timestamp": -1 } };
  var limit = { $limit: limit };
  var group = { $group: { _id: "$properties.user", locations: { $push: {geometry: "$geometry", properties: "$properties"} }}};
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