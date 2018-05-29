let mongoose = require('mongoose');

// Creates a new Mongoose Schema object
let Schema = mongoose.Schema;

// Collection to hold counters/sequences for ids
let CounterSchema = new Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true }
},{
  versionKey: false
});

// Creates the Model for the Attachments Schema
let Counter = mongoose.model('Counter', CounterSchema);

function range(start, end) {
  let values = [];
  for (var i = start; i <= end; i++) {
    values.push(i);
  }

  return values;
}

function getNext(collection) {
  return getGroup(collection, 1).then(function(ids) {
    return Promise.resolve(ids[0]);
  });
}

function getGroup(collection, amount) {
  const query = {_id: collection};
  const update = {$inc: {sequence: amount}};
  const options = {upsert: true, new: true};

  return Counter.findOneAndUpdate(query, update, options).exec().then(function(counter) {
    const ids = range(counter.sequence, counter.sequence + amount);
    return Promise.resolve(ids);
  });
}

exports.getNext = getNext;
exports.getGroup = getGroup;
