var express = require("express")
  , bodyParser = require('body-parser')
  , multer = require('multer')
  , path = require('path')
  , mongoose = require('mongoose')
  , fs = require('fs-extra')
  , log = require('winston')
  , config = require('./config.json')
  , provision = require('./provision');

log.remove(log.transports.Console);
log.add(log.transports.Console, {
  timestamp: true,
  level: 'debug',
  colorize: true
});

mongoose.Error.messages.general.required = "{PATH} is required.";

log.info('Starting mage');

var optimist = require("optimist")
  .usage("Usage: $0 --port [number]")
  .describe('port', 'Port number that MAGE node server will run on.')
  .default('port', 4242);
var argv = optimist.argv;
if (argv.h || argv.help) return optimist.showHelp();

// Create directory for storing SAGE media attachments
var attachmentBase = config.server.attachment.baseDirectory;
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    console.error("Could not create directory to store MAGE media attachments. "  + err);
    throw err;
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
var authentication = require('./authentication')(config.api.authentication.strategy);
var provisioning = require('./provision/' + config.api.provision.strategy)(provision);
console.log('Authentication: ' + authentication.loginStrategy);
console.log('Provision: ' + provisioning.strategy);

// Configuration of the MAGE Express server
var app = express();
var mongodbConfig = config.server.mongodb;

var mongoUri = "mongodb://" + mongodbConfig.host + "/" + mongodbConfig.db;
mongoose.connect(mongoUri, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    console.log('Error connecting to mongo database, please make sure mongodb is running...');
    throw err;
  }
});
// mongoose.set('debug', function(collection, method, query, doc, options) {
//   log.debug("(mongoose) %s.%s(%j, %j, %j)", collection, method, query, doc, options);
// });
mongoose.set('debug', true);

app.use(function(req, res, next) {
  req.getRoot = function() {
    return req.protocol + "://" + req.get('host');
  }

  req.getPath = function() {
    return req.getRoot() + req.path;
  }

  return next();
});

app.set('config', config);
app.enable('trust proxy');

app.use(function(req, res, next) {
  req.getRoot = function() {
    return req.protocol + "://" + req.get('host');
  }
  return next();
});
app.use(require('body-parser')({ keepExtensions: true}));
app.use(require('method-override')());
app.use(require('multer')());
app.use(authentication.p***REMOVED***port.initialize());
app.use(express.static(path.join(__dirname, process.env.NODE_ENV === 'production' ? 'public/dist' : 'public')));
app.use('/api/swagger', express.static('./public/vendor/swagger-ui/'));
app.use('/private',
  authentication.p***REMOVED***port.authenticate(authentication.authenticationStrategy),
  express.static(path.join(__dirname, 'private')));
app.use(function(err, req, res, next) {
  console.error(err.message);
  console.error(err.stack);
  res.send(500, 'Internal server error, please contact MAGE administrator.');
});


// Configure routes
require('./routes')(app, {authentication: authentication, provisioning: provisioning});

// Launches the Node.js Express Server
var port = argv.port;
app.listen(port);
console.log('MAGE Server: Started listening on port ' + port);

// install all plugins
require('./plugins');
