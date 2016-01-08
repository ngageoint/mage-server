var express = require("express")
  , passport = require('passport')
  , bodyParser = require('body-parser')
  , multer = require('multer')
  , path = require('path')
  , mongoose = require('mongoose')
  , fs = require('fs-extra')
  , util = require('util')
  , config = require('./config.js')
  , log = require('./logger')
  , provision = require('./provision');

var mongooseLogger = log.loggers.get('mongoose');

mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

mongoose.Error.messages.general.required = "{PATH} is required.";

log.info('Starting mage');

var optimist = require("optimist")
  .usage("Usage: $0 --port [number] --address [string]")
  .describe('port', 'Port number that MAGE node server will run on.')
  .describe('address', 'Address / network interface to listen on')
  .default('port', 4242)
  .default('address', '0.0.0.0');
var argv = optimist.argv;
if (argv.h || argv.help) return optimist.showHelp();

// Create directory for storing SAGE media attachments
var attachmentBase = config.server.attachment.baseDirectory;
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE media attachments. "  + err);
    throw err;
  } else {
    log.info("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

var iconBase = config.server.iconBaseDirectory;
fs.mkdirp(iconBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE icons. "  + err);
  } else {
    log.info("Using '" + iconBase + "' as base directory for MAGE icons.");
  }
});

var mongodbConfig = config.server.mongodb;

var mongoUri = "mongodb://" + mongodbConfig.host + "/" + mongodbConfig.db;
mongoose.connect(mongoUri, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodb is running...');
    throw err;
  }
});

var app = require('./express.js');

// Launches the Node.js Express Server
var port = argv.port;
var address = argv.address;
app.listen(port, address);
log.info(util.format('MAGE Server: Started listening at address %s on port %s', address, port));

// install all plugins
require('./plugins');
