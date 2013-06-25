module.exports = function() {

  var mongoose = require('mongoose')
    , hasher = require('../utilities/pbkdf2')();
  
  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;  

  // Creates the Schema for FFT Locations
  var LocationSchema = new Schema({
    username: { type: String, required: true },
    geometry: {
      type: { type: String, required: true },
      coordinates: { type: Array, required: true}
    },
    properties: Schema.Types.Mixed,    
  });

  // Creates the Model for the User Schema
  var Location = mongoose.model('Location', LocationSchema);

   
  //create location
  var createLocation = function(user,callback) {

    var location = {
      user: user._id,
      geometry: {
        type: 'Point',
        coordinates: [data.geometry.x, data.geometry.y]
      },
      properties: properties
    };
    Location.create(location, callback);
  }

  //get locations
  var getLocations = function(callback) {
    var query = {};
    Location.find(query, function (err, locations) {
      if (err) {
        console.log("Error finding locations in mongo: " + err);
      }

      callback(locations);
    });
  }

  //return functions
  return {
    getLocations: getLocations,
    createLocation: createLocation
  }



}()