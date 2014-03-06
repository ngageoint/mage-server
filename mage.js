var express = require("express")
  , mongoose = require('mongoose')
  , path = require("path")
  , fs = require('fs-extra')
  , config = require('./config.json')
  , provision = require('./provision');

var optimist = require("optimist")
  .usage("Usage: $0 --port [number]")
  .describe('port', 'Port number that MAGE node server will run on.')
  .default('port', 4242);
var argv = optimist.argv;
if (argv.h || argv.help) return optimist.showHelp();

// Create directory for storing SAGE media attachments
var attachmentBase = config.server.attachmentBaseDirectory;
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store MAGE media attachments. "  + err);
  } else {
    console.log("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

var iconBase = config.server.iconBaseDirectory;
fs.mkdirp(iconBase, function(err) {
  if (err) {
    console.error("Could not create directory to store MAGE icons. "  + err);
  } else {
    console.log("Using '" + iconBase + "' as base directory for MAGE icons.");
  }
});

// Configure authentication
var authentication = require('./authentication')(config.server.authentication.strategy);
var provisioning = require('./provision/' + config.server.provision.strategy)(provision);
console.log('Authentication: ' + authentication.loginStrategy);
console.log('Provision: ' + provisioning.strategy);

// Configuration of the MAGE Express server
var app = express();
var mongodbConfig = config.server.mongodb;
app.configure(function () {
  mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
    if (err) {
      console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
      throw err;
    }
  });
  mongoose.set('debug', true);

  app.set('config', config);

  app.use(function(req, res, next) {
    req.getRoot = function() {
      return req.protocol + '://' + req.get('host');
    }
    return next();
  });
  app.use(express.bodyParser({ keepExtensions: true}));
  app.use(express.methodOverride());
  app.use(authentication.p***REMOVED***port.initialize());
  app.use(app.router);
  app.use('/private', express.static(path.join(__dirname, "private")));
  app.use(express.static(path.join(__dirname, "public")));
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Internal server error, please contact MAGE administrator.');
  });
});

// Configure routes
require('./routes')(app, {authentication: authentication, provisioning: provisioning});

// Launches the Node.js Express Server
var port = argv.port;
app.listen(port);
console.log('MAGE Server: Started listening on port ' + port);
