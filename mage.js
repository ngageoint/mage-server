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

// Import static models
var counters = require('./models/counters')(mongoose);
var models = {
  Counters: counters,
  User: require('./models/user')(mongoose),
  Token: require('./models/token')(mongoose),
  Team: require('./models/team')(mongoose),
  Role: require('./models/role')(),
  Layer: require('./models/layer')(mongoose, counters),
  Feature: require('./models/feature')(mongoose, counters, async)
}

// Configure authentication
var auth = require('./auth/authentication')(argv.a, models);

// Configuration of the MAGE Express server
app.configure(function () {
  mongoose.connect(dbPath, function(err) {
    if (err) throw err;
  });
  mongoose.set('debug', true);

  app.set('attachmentBase', attachmentBase);

  // app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  // app.use(express.session({cookie: { path: '/', httpOnly: true, maxAge: null }, ***REMOVED***: '***REMOVED***'}));
  app.use(auth.p***REMOVED***port.initialize());
  // app.use(auth.p***REMOVED***port.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, "public")));
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Internal server error, please contact SAGE administrator.');
  });
});

//app.all('/FeatureServer/*', auth.p***REMOVED***port.authenticate('local'));

// Create directory for storing SAGE media attachments
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store SAGE media attachments. "  + err);
  } else {
    console.log("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

// pull in any utilities
var jsol = require('./utilities/jsol');
var geometryFormat = require('./format/geometryFormat')(jsol);
var geoJsonFormat = require('./format/geoJsonFormat')(jsol);
var transformers = {
  esri: require('./transformers/esri')(geometryFormat),
  geojson: require('./transformers/geojson')()
}
var utilities = {
  auth: auth,
  async: async,
  fs: fs,
  jsol: jsol,
  transformers: transformers,
  geometryFormat: geometryFormat,
  geoJsonFormat: geoJsonFormat
}

// Dynamically import all routes
fs.readdirSync('routes').forEach(function(file) {
  if (file[0] == '.') return;
  var route = file.substr(0, file.indexOf('.'));
  require('./routes/' + route)(app, models, fs, transformers, async, utilities);
});

// Launches the Node.js Express Server
app.listen(4242);
console.log('MAGE Node Server: Started listening on port 4242.');