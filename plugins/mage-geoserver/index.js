var async = require('async')
  , express = require('express')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , util = require('util')
  , proxy = require('http-proxy-middleware')
  , URL = require('url')
  , config = require('./config')
  , log = require('winston')
  , api = require('../../api')
  , Event = api.Event
  , Observation = api.Observation
  , Location = api.Location;

require('./authentication')(passport);

var mongo = config.mongo;
log.info('Geoserver using mongodb connection uri %s', mongo.uri);
mongoose.connect(mongo.uri, mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodb is running.', err);
    throw err;
  }
});

var mongooseLogger = log.loggers.get('mongoose');
mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%s, %s, %s)", collection, method, this.$format(query), this.$format(doc), this.$format(options));
});

async.series([
  function(done) {
    var workspace = require('./geoserver/workspace');
    workspace.create(done);
  },
  function(done) {
    var datastore = require('./geoserver/datastore');
    datastore.create(done);
  },
  function(done) {
    var eventSync = require('./sync/event');
    eventSync.sync(done);
  },
  function(done) {
    var observationSync = require('./sync/observation');
    observationSync.sync(done);
  },
  function(done) {
    var locationSync = require('./sync/location');
    locationSync.sync(done);
  },
  function(done) {
    var userSync = require('./sync/user');
    userSync.sync(done);
  }
], function(err) {
  if (err) {
    log.error('Error initializing geoserver', err);
    throw(err);
  }

  log.info('Done with sync to geoserver');

  // TODO let mage know we are done initializing this plugin
  registerListeners();
});

var urlFilter = new RegExp('^/' + config.context + '/' + config.token + '/(.*)');

function filter(pathname) {
  var filter = urlFilter.exec(pathname);

  return filter;
}

function pathRewrite(path, req) {
  var url = URL.parse(urlFilter.exec(path)[1], Boolean('parse query string'));
  delete url.search;

  var wmsMatch = /service=wms/i.exec(url.path);
  if (wmsMatch && !url.query['SLD_BODY']) {
    var layers = '';
    var layersMatch = /layers=([^&]*)/i.exec(url.path);
    if (layersMatch && layersMatch.length > 1) {
      layers = layersMatch[1];
    }

    url.query.sld = util.format('%s/ogc/sld?layers=%s&access_token=%s', req.getRoot(), layers, config.token);
  }

  var forward = '/geoserver/' + URL.parse(URL.format(url)).path;

  return forward;
}

var geoserverProxy = proxy(filter, {
  target: config.geoserver.url,
  pathRewrite: pathRewrite,
  logLevel: 'debug'
});

var geoserver = new express.Router();
geoserver.use(geoserverProxy);

// include routes
require('./routes')(geoserver, {passport: passport});

module.exports = {
  context: config.context,
  express: geoserver
};

function registerListeners() {
  var ObservationModel = require('./models/observation');
  Observation.on.add(ObservationModel.createObservation);
  Observation.on.update(ObservationModel.updateObservation);
  Observation.on.remove(ObservationModel.removeObservation);
  Event.on.remove(ObservationModel.removeObservations);

  var LocationModel = require('./models/location');
  Location.on.add(LocationModel.createLocations);
  Event.on.remove(LocationModel.removeLocations);

  var UserModel = require('./models/user');
  Location.on.add(UserModel.createLocations);
  Event.on.remove(UserModel.removeLocations);

  var SchemaModel = require('./models/schema');
  Event.on.remove(SchemaModel.removeSchema);

  var GeoServerObservation = require('./geoserver/observation');
  Event.on.add(GeoServerObservation.createLayer);
  Event.on.update(GeoServerObservation.updateLayer);
  Event.on.remove(GeoServerObservation.removeLayer);

  var GeoServerLocation = require('./geoserver/location');
  Event.on.add(GeoServerLocation.createLayer);
  Event.on.remove(GeoServerLocation.removeLayer);
}
