var mongoose = require('mongoose')
, config = require('./testconfig.js');

// Require this file and you will have a mongo connection up

var mongodbConfig = config.server.mongodb;
var mongoUri = "mongodb://" + mongodbConfig.host + "/" + mongodbConfig.db;
mongoose.connect(mongoUri);
var dbStatus = mongoose.connection;
dbStatus.on('error', console.error.bind(console, 'dbTest connection error:'));

module.exports = mongoose.connection;
