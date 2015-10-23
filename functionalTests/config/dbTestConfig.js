var mongoose = require('mongoose')
, config = require('./testConfig.json');

// Require this file and you will have a mongo connection up

var mongodbConfig = config.server.mongodb;
var mongoUri = "mongodb://" + mongodbConfig.host + "/" + mongodbConfig.db;
mongoose.connect(mongoUri);
var dbStatus = mongoose.connection;
dbStatus.on('error', console.error.bind(console, 'dbTest connection error:'));
// dbStatus.once('open', function (callback) {
//   console.log("dbTest successully connected");
// });

module.exports = mongoose.connection;
