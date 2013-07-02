
var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;  

// Creates the Schema for FFT Locations
var LocationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  createdOn: { type: Date, required: true, index: true },
  updatedOn: { type: Date, required: true, index: true },
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true}
  },
  properties: Schema.Types.Mixed
});

// Creates the Model for the User Schema
var Location = mongoose.model('Location', LocationSchema);
 
// create location
exports.createLocation = function(user, data, callback) {
  var properties = data.properties ? data.properties : {};
  var now = new Date();
  var doc = {
    user: user._id,
    createdOn: now,
    updatedOn: now,
    geometry: {
      type: 'Point',
      coordinates: [data.geometry.x, data.geometry.y]
    },
    properties: properties
  };

  Location.create(doc, function(err, location) {
    if (err) {
      console.log('Error creating new location for user: ' + user.username + '.  Err:' + err);
    }

    callback(err, location);
  });
}

// get all locations
exports.getLocations = function(callback) {
  var query = {};
  var options = {sort: {updatedOn: -1}};
  Location.find(query, options, function (err, locations) {
    if (err) {
      console.log("Error finding locations: " + err);
    }

    callback(err, locations);
  });
}

// get locations for users team
exports.getLocationsForTeam = function(user, callback) {
  // for PDC we will only have one team, so just grab locations for all users
  Location.aggregate(
    { $group: { _id: $user }},
    { $sort: { updatedOn: -1}},
    { $limit: 1 }, 
    function(err, aggregate) {
      console.log("Got aggregate: " + JSON.stringify(aggregate));
      callback(err, aggregate);
    }
  );
}

// update a location
exports.updateDateForLatestLocation = function(user, date, callback) {
  var query = {user: user._id};
  var update = {updatedOn: new Date()};
  var options = {sort: {updatedOn: -1}};
  Location.findOneAndUpdate(query, update).limit(1).exec(function(err, location) {
    if (err) {
      console.log("Error updating date on latesest location for user : " + user.username + ". Error: " + err);
    }

    callback(err, location);
  });
}