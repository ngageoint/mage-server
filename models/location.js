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

exports.getLocations = function(options, callback) {
  var limit = 2000;
  if (options.limit && options.limit < 2000) {
    limit = options.limit;
  }

  var filter = options.filter || {};

  var query = {};
  if (filter.lastLocationId && (filter.startDate || filter.endDate)) {
    query['$or'] = [{_id: {'$gt': filter.lastLocationId}}];
    if (filter.startDate) {
      query['$or'] = [{
        _id: {'$gt': filter.lastLocationId},
        'properties.timestamp': filter.startDate
      },{
        'properties.timestamp': {'$gt': filter.startDate}
      }];
    }

    if (filter.endDate) query['properties.timestamp'] = {'$lt': filter.endDate};
  } else if (filter.startDate || filter.endDate) {
    if (filter.startDate) query['properties.timestamp'] = {'$gte': filter.startDate};
    if (filter.endDate) query['properties.timestamp'] = {'$lt': filter.endDate};
  }

  if (filter.userId) {
    query['properties.user'] = filter.userId;
  }

  Location.find(query, {}, {sort: {"properties.timestamp": 1, _id: 1}, limit: limit}, function (err, locations) {
    if (err) {
      console.log("Error finding locations", err);
    }

    callback(err, locations);
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
