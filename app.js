var express = require("express")
  , passport = require('passport')
  , bodyParser = require('body-parser')
  , multer = require('multer')
  , path = require('path')
  , mongoose = require('mongoose')
  , fs = require('fs-extra')
  , util = require('util')
  , config = require('./config')
  , environment = require('environment')
  , log = require('./logger')
  , provision = require('./provision');

var mongooseLogger = log.loggers.get('mongoose');

mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

mongoose.Error.messages.general.required = "{PATH} is required.";

log.info('Starting MAGE');

// Create directory for storing SAGE media attachments
var attachmentBase = environment.attachmentBaseDirectory;
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE media attachments. "  + err);
    throw err;
  } else {
    log.info("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

var iconBase = environment.iconBaseDirectory;
fs.mkdirp(iconBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE icons. "  + err);
  } else {
    log.info("Using '" + iconBase + "' as base directory for MAGE icons.");
  }
});

var mongodbConfig = config.server.mongodb;

var mongo = environment.mongo;
log.info('using mongodb connection from: ' + mongo.uri);
mongoose.connect(mongo.uri, {server: {poolSize: mongo.poolSize}}, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodb is running...');
    throw err;
  }
});

var app = require('./express.js');

// Launches the Node.js Express Server
app.listen(environment.port, environment.address, function() {
    log.info(util.format('MAGE Server: Started listening at address %s on port %s', environment.address, environment.port));
});

// install all plugins
require('./plugins');
