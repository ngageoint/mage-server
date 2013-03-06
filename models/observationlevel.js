module.exports = function(mongoose) {
  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;  

  // Creates the Schema for the Observation Level object
  var ObservationLevelSchema = new Schema({ 
      observation_level: { type: String, required: false }
    },{ 
      versionKey: false 
    }
  );

  // Creates the Model for the Attachments Schema
  var ObservationLevel = mongoose.model('ObservationLevel', ObservationLevelSchema);

  return {
    ObservationLevel: ObservationLevel
  }
}