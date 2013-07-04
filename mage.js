var express = require("express")
  , mongoose = require('mongoose')
  , path = require("path")
  , fs = require('fs-extra')
  , config = require('config.json');

// Create directory for storing SAGE media attachments
var attachmentBase = config.server.attachmentBaseDirectory;
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store MAGE media attachments. "  + err);
  } else {
    console.log("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

// Configure authentication
var auth = require('./auth/authentication')(config.api.authentication.strategy);
console.log('Authentication: ' + auth.strategy);

// Configuration of the MAGE Express server
var app = express();
app.configure(function () {
  mongoose.connect('mongodb://localhost/sagedb', function(err) {
    if (err) throw err;
  });
  mongoose.set('debug', true);

  app.set('config', config);

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(auth.p***REMOVED***port.initialize());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, "public")));
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Internal server error, please contact MAGE administrator.');
  });
});

// Configure routes
require('./routes')(app, auth);

// Launches the Node.js Express Server
app.listen(4242);
console.log('MAGE Server: Started listening on port 4242.');