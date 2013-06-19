var express = require("express");
var mongoose = require('mongoose');
var path = require("path");
var fs = require('fs-extra');
var async = require('async');
var argv = require('optimist')
  .default('a', 'local')
  .default('d', '/var/lib/sage/attachments')
  .argv;

var app = express();

var attachmentBase = argv.d + '/';
var dbPath = 'mongodb://localhost/sagedb';

// Dynamically pull in auth module
var User = require('./models/user')(mongoose);
var auth = require('./auth/' + argv.a)(User);

// Configuration of the SAGE Express server
app.configure(function () {
  mongoose.connect(dbPath, function(err) {
    if (err) throw err;
  });
  mongoose.set('debug', true);

  app.set('attachmentBase', attachmentBase);

  if (auth.strategy) {
    console.info('Setting up authentication strategy: ' + auth.strategy);
    app.use(auth.p***REMOVED***port.initialize());
    app.use(auth.p***REMOVED***port.session());
  }

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

app.all('/FeatureServer/*', auth.p***REMOVED***port.authenticate(auth.authenticationStrategy));

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
  User: User,
  Layer: require('./models/layer')(mongoose, counters),
  Feature: require('./models/feature')(mongoose, counters, async)
}

// pull in any utilities
var jsol = require('./utilities/jsol');
var geometryFormat = require('./format/geometryFormat')(jsol);
var geoJsonFormat = require('./format/geoJsonFormat')(jsol);

var utilities = {
  auth: auth,
  jsol: jsol,
  geometryFormat: geometryFormat,
  geoJsonFormat: geoJsonFormat
}

var tranformers = {
  esri: require('./transformers/esri')(geometryFormat),
  geojson: require('./transformers/geojson')()
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