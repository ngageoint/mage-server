var express = require('express')
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
log.info('using mongodb connection from: ' + mongo.uri);
mongoose.connect(mongo.uri, mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodb is running...');
    throw err;
  }
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

// listen for observation changes
var ObservationModel = require('./models/observation');
Observation.on.add(ObservationModel.createObservation);
Observation.on.update(ObservationModel.updateObservation);
Observation.on.remove(ObservationModel.removeObservation);

var LocationModel = require('./models/location');
Location.on.add(LocationModel.createLocations);

var UserModel = require('./models/user');
Location.on.add(UserModel.createLocations);

var GeoServerApi = require('./geoserver/api');
Event.on.add(GeoServerApi.createLayer);
Event.on.update(GeoServerApi.updateLayer);
Event.on.remove(GeoServerApi.removeLayer);

// include routes
require('./routes')(geoserver, {passport: passport});

module.exports = {
  context: config.context,
  express: geoserver
};
