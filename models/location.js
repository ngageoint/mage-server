
var mongoose = require('mongoose')
  , geoJSON = require('../transformers/geojson');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;  

// Creates the Schema for FFT Locations
var LocationSchema = new Schema({
  //user: { type: Schema.Types.ObjectId, required: true },
  //createdOn: { type: Date, required: true, index: true },
  //updatedOn: { type: Date, required: true, index: true },
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true}
  },
  properties: Schema.Types.Mixed
},{ 
    versionKey: false 
});

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

// TODO index user, createdOn and updatedOn
 
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

// // get all locations
// exports.getLocations = function(callback) {
//   var query = {};
//   var options = {sort: {updatedOn: -1}};
//   Location.find(query, function (err, locations) {
//     if (err) {
//       console.log("Error finding locations: " + err);
//     }

//     callback(err, locations);
//   });
// }

// get locations for users team
exports.getLocations = function(user, limit, callback) {
  var group = { $group: { _id: "$properties.user", locations: { $push: {location: {geometry: "$geometry", properties: "$properties"} } }}};
  var sort = { $sort: { "properties.updatedOn": 1 }};
  var project = {};
  //var group = { $group: { _id: "$properties.user", locations: { $push: "$geometry"}}};
  Location.aggregate(group, sort,
    //{ $limit: limit }, 
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