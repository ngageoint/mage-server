
var mongoose = require('mongoose')
  , geoJSON = require('../transformers/geojson');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;  

// Creates the Schema for FFT Locations
var LocationSchema = new Schema({
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true}
  },
  properties: Schema.Types.Mixed
},{ 
    versionKey: false 
});

// TODO when user is removed need to remove thier locations.

LocationSchema.set("toObject", {
  transform: geoJSON.transformFeature
});

LocationSchema.set("toJSON", {
  transform: geoJSON.transformFeature
});

LocationSchema.index({'properties.createdOn': 1});
LocationSchema.index({'properties.updatedOn': 1});
LocationSchema.index({'properties.user': 1, 'properties.createdOn': 1});
LocationSchema.index({'properties.user': 1, 'properties.updatedOn': 1});

// Creates the Model for the User Schema
var Location = mongoose.model('Location', LocationSchema);
 
// create location
exports.createLocation = function(user, feature, callback) {
  var doc = {
    geometry: feature.geometry,
    properties: feature.properties
  };

  Location.create(doc, function(err, location) {
    if (err) {
      console.log('Error creating new location for user: ' + user.username + '.  Err:' + err);
    }

    callback(err, location);
  });
}

// get locations for users team
exports.getLocations = function(user, limit, callback) {
  var sort = { $sort: { "properties.updatedOn": -1 }};
  var limit = { $limit: limit };
  var group = { $group: { _id: "$properties.user", locations: { $push: {location: {geometry: "$geometry", properties: "$properties"} } }}};
  var project = { $project: { _id: 0, user: "$_id", locations: "$locations"} };
  Location.aggregate(sort, limit, group, project, function(err, aggregate) {
    console.log("Got aggregate: " + JSON.stringify(aggregate));
    callback(err, aggregate);
  });
}

// update latest location
exports.updateLocation = function(user, timestamp, callback) {
  var conditions = {"properties.user": user._id};
  var update = {"properties.updatedOn": timestamp};
  var options = {sort: {"properties.updatedOn": -1}};
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