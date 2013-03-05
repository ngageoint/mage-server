module.exports = function(mongoose) {
  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;

  // Creates the Schema for the Observation Type object
  var ObservationType = new Schema({ 
      observation_type: { type: String, required: false }
    },{
      versionKey: false 
    });

    // Creates the Model for the Attachments Schema
  var ObservationTypeModel = mongoose.model('ObservationType', ObservationType);

  return {
    ObservationType: ObservationType
  }
}