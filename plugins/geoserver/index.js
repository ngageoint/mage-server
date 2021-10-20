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

exports.initialize = function(app, callback) {
  if (!config.enable) {
    return callback();
  }

  log.info('Initializing geoserver plugin');

  var mongo = config.mongo;
  log.info('Geoserver using mongodb connection uri %s', mongo.uri);
  mongoose.connect(mongo.uri, mongo.options, function(err) {
    if (err) {
      log.error('Error connecting to mongo database, please make sure mongodb is running.', err);
      throw err;
    }
  });

  var geoserver = setupGeoserverProxy();

  // include routes
  require('./routes')(geoserver, {passport: passport});

  app.use('/' + config.context, geoserver);

  syncDataToGeoserver(function(err) {
    if (err) {
      log.error('Error syncing data to geoserver', err);
      return callback(err);
    }

    registerListeners();
    callback();
  });
};

function setupGeoserverProxy() {
  var urlFilter = new RegExp('^/' + config.context + '/' + config.token + '/(.*)');

  function filter(pathname) {
    return urlFilter.exec(pathname);
  }

  function pathRewrite(path, req) {
    var url = URL.parse(urlFilter.exec(path)[1], Boolean('parse query string'));
    delete url.search;

    var wmsMatch = /request=GetMap/i.exec(url.path);
    if (wmsMatch && !url.query['SLD_BODY']) {
      var layers = '';
      var layersMatch = /layers=([^&]*)/i.exec(url.path);
      if (layersMatch && layersMatch.length > 1) {
        layers = layersMatch[1];
      }

      url.query.sld = util.format('%s/ogc/sld?layers=%s&access_token=%s', req.getRoot(), layers, config.token);
    }

    return '/geoserver/' + URL.parse(URL.format(url)).path;
  }

  var geoserverProxy = proxy(filter, {
    target: config.geoserver.url,
    pathRewrite: pathRewrite,
    logLevel: 'debug'
  });

  var geoserver = new express.Router();
  geoserver.use(geoserverProxy);

  return geoserver;
}

function syncDataToGeoserver(callback) {
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
    callback(err);
  });
}

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

  var GeoServerUser = require('./geoserver/user');
  Event.on.add(GeoServerUser.createLayer);
  Event.on.remove(GeoServerUser.removeLayer);
}
