var express = require("express")
  , passport = require('passport')
  , bodyParser = require('body-parser')
  , multer = require('multer')
  , path = require('path')
  , mongoose = require('mongoose')
  , fs = require('fs-extra')
  , util = require('util')
  , cfenv = require('cfenv')
  , config = require('./config.js')
  , log = require('./logger')
  , provision = require('./provision');

var appEnv = cfenv.getAppEnv();
var mongooseLogger = log.loggers.get('mongoose');

mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

mongoose.Error.messages.general.required = "{PATH} is required.";

log.info('Starting mage');

var optimist = require("optimist")
  .usage("Usage: $0 --port [number] --address [string]")
  .describe('port', 'Port number that MAGE node server will run on.')
  .describe('address', 'Address / network interface to listen on');
var argv = optimist.argv;
if (argv.h || argv.help) return optimist.showHelp();

// Create directory for storing SAGE media attachments
var attachmentBase = path.resolve(config.server.attachment.baseDirectory);
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE media attachments. "  + err);
    throw err;
  } else {
    log.info("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

var iconBase = path.resolve(config.server.iconBaseDirectory);
fs.mkdirp(iconBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE icons. "  + err);
  } else {
    log.info("Using '" + iconBase + "' as base directory for MAGE icons.");
  }
});

var mongodbConfig = config.server.mongodb;

var mongoConfig = appEnv.getServiceCreds('MongoInstance');
//Did we get a mongo config from the cloud configuration?
if( mongoConfig ) {
  var mongoUri = mongoConfig.uri;
} else {
  //otherwise use defaults in config
  var mongodbConfig = config.server.mongodb;
  var mongoUri = mongodbConfig.scheme + '://' + mongodbConfig.host +  ':' + mongodbConfig.port + '/' + mongodbConfig.db;
}

log.info('using mongodb connection from: ' + mongoUri);
mongoose.connect(mongoUri, {server: {poolSize: config.server.mongodb.poolSize}});
mongoose.connection.on('error', function() {
  log.error('Error connecting to mongo database, please make sure mongodb is running...');
  throw err;
});

var setup = require('./setup');
setup(function(status) {
  if( !status ) {
    log.info('Unable to run setup on mongodb. Quitting MAGE...');
    process.exit(2);
  }
  log.info('Completed initial setup');
});

var app = require('./express.js');

// Launches the Node.js Express Server
var port = argv.port || appEnv.port;
var address = argv.address || appEnv.bind;
app.listen(port, address, function() {
    log.info(util.format('MAGE Server: Started listening at address %s on port %s', address, port));
});

// install all plugins
require('./plugins');
