// var mongoose = require("mongoose");

// var ItemSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     index: true
//   }
// });

// module.exports = mongoose.model('Item', ItemSchema);

module.exports = function() {
  var Counter = require('./counter');

  return {
    Counter: Counter,
    User: require('./user'),
    Token: require('./token'),
    Team: require('./team'),
    Role:  require('./role'),
    Layer: require('./layer'),
    Feature: require('./feature')
  }
}()