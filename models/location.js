module.exports = function(mongoose) {
  
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

  var createLocation = function(layer, data, callback) {

    var location = {
      geometry: {
        type: 'Point',
        coordinates: [data.geometry.x, data.geometry.y]
      },
      properties: properties
    };
    Location.create(location, callback);
  }

  var getLocations = function(callback) {
    var query = {};
    Location.find(query, function (err, teams) {
      if (err) {
        console.log("Error finding locations in mongo: " + err);
      }

      callback(teams);
    });
  }

  return {
    getTeams: getTeams
  }
}