var express = require("express");
var mongoose = require('mongoose');
var path = require("path");
var fs = require('fs-extra');
var async = require('async');
var argv = require('optimist')
  .default('a', 'local')
  .default('d', '/var/lib/sage/attachments')
  .argv;

// Create directory for storing SAGE media attachments
var attachmentBase = argv.d + '/';
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store SAGE media attachments. "  + err);
  } else {
    console.log("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

// Configure authentication
var auth = require('./auth/authentication')(argv.a);
console.log('auth is: ' + auth.toString());

// Configuration of the MAGE Express server
var app = express();
app.configure(function () {
  mongoose.connect('mongodb://localhost/sagedb', function(err) {
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

// Configure routes
require('./routes')(app, auth);

// Launches the Node.js Express Server
app.listen(4242);
console.log('MAGE Node Server: Started listening on port 4242.');