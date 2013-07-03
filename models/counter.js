var mongoose = require('mongoose');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;  

// Collection to hold counters/sequences for ids
var CounterSchema = new Schema({  
    _id: { type: String, required: true },  
    sequence: { type: Number, required: true }
  },{ 
    versionKey: false 
  }
);

// Creates the Model for the Attachments Schema
var Counter = mongoose.model('Counter', CounterSchema);

var range = function(start, end) {
  var values = [];
  for (var i = start; i <= end; i++) {
    values.push(i);
  }

  return values;
}

var getNext = function(collection, callback) {
  getGroup(collection, 1, function(ids) {
    callback(ids[0]);
  });
}

var getGroup = function(collection, amount, callback) {
  var query = {_id: collection};
  var update = {$inc: {sequence: amount}};
  var options = {upsert: true};
  Counter.findOneAndUpdate(query, update, options, function(err, counter) {
    if (err) {
      console.log(JSON.stringify(err));
    }

    var ids = range(counter.sequence, counter.sequence + amount);
    callback(ids);
  });
}

exports.getNext = getNext;
exports.getGroup = getGroup;