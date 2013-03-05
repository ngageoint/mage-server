module.exports = function(mongoose) {
  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;  

  // Collection to hold counters/sequences for ids
  var Counters = new Schema({  
      _id: { type: String, required: true },  
      sequence: { type: Number, required: true }
    },{ 
      versionKey: false 
    }
  );

  // Creates the Model for the Attachments Schema
  var Counters = mongoose.model('Counters', Counters);

  var getNext = function(collection, callback) {
    var query = {_id: collection};
    var update = {$inc: {sequence: 1}};
    var options = {new: true, upsert: true};
    Counters.findOneAndUpdate(query, update, options, function(err, counter) {
      if (err) {
        console.log(JSON.stringify(err));
      }

      callback(counter.sequence);
    });
  }

  return {
    getNext: getNext
  }
}