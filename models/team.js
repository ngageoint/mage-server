module.exports = function(mongoose) {
  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;  

  // Creates the Schema for the Teams object
  var Team = new Schema({ 
      team_name: { type: String, required: false }
    },{ 
      versionKey: false 
    }
  );

  // Creates the Model for the Attachments Schema
  var TeamModel = mongoose.model('Team', Team);

  return {
    TeamModel: TeamModel
  }
}