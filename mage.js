var express = require("express");
var mongoose = require('mongoose');
var path = require("path");
var fs = require('fs-extra');
var async = require('async');
var argv = require('optimist')
  .default('a', 'local')
  .default('d', '/var/lib/sage/attachments')
  .argv;


var attachmentBase = argv.d + '/';
var dbPath = 'mongodb://localhost/sagedb';

// Pull in database models
var models = require('./models');

// Configure authentication
var auth = require('./auth/authentication')(argv.a, models);
console.log('auth is: ' + auth.toString());

// Configuration of the MAGE Express server
var app = express();
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

// Create directory for storing SAGE media attachments
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store SAGE media attachments. "  + err);
  } else {
    console.log("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});


// pull in all routes
// Protect all FeatureServer routes with token authentication
app.all('/FeatureServer*', auth.p***REMOVED***port.authenticate('bearer', {session: false}));

// Dynamically import all routes
fs.readdirSync('./routes').forEach(function(file) {
  if (file[0] == '.') return;
  var route = file.substr(0, file.indexOf('.'));
  console.log('route is: ' + route);
  require('./routes/' + route)(app, models, auth);
});

// Launches the Node.js Express Server
app.listen(4242);
console.log('MAGE Node Server: Started listening on port 4242.');