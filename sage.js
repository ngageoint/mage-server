var express = require("express");
var mongoose = require('mongoose');
var path = require("path");
var fs = require('fs-extra');
var async = require('async');
var argv = require('optimist')
  .default('a', '/var/lib/sage/attachments')
  .argv;

var app = express();

var attachmentBase = argv.a + '/';
var dbPath = 'mongodb://localhost/sagedb';

// Configuration of the SAGE Express server
app.configure(function () {
  mongoose.connect(dbPath, function(err) {
    if (err) throw err;
  });
  mongoose.set('debug', true);

  app.set('attachmentBase', attachmentBase);

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, "public")));
  app.use('/extjs', express.static(path.join(__dirname, "extjs")));
  app.use('/geoext', express.static(path.join(__dirname, "geoext")));
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Internal server error, please contact SAGE administrator.');
  });
});

// Create directory for storing SAGE media attachments
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store SAGE media attachments. "  + err);
  } else {
    console.log("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

// Import static models
var counters = require('./models/counters')(mongoose);
var models = {
  Counters: counters,
  Layer: require('./models/layer')(mongoose, counters),
  Feature: require('./models/feature')(mongoose, counters, async)
}

// pull in any utilities
var jsol = require('./utilities/jsol');
var geometry = require('./utilities/geometry')(jsol);
var utilities = {
  jsol: jsol,
  geometry: geometry
}

var tranformers = {
  esri: require('./transformers/esri')(geometry)
}

// Dynamically import all routes
fs.readdirSync('routes').forEach(function(file) {
  if (file[0] == '.') return;
  var route = file.substr(0, file.indexOf('.'));
  require('./routes/' + route)(app, models, fs, tranformers, async, utilities);
});

// Launches the Node.js Express Server
app.listen(4242);
console.log('SAGE Node Server: Started listening on port 4242.');