var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , proxy = require('express-http-proxy')
  , URL = require('url')
  , config = require('./config');

require('./authentication')(passport);

// var urlFilter = new RegExp('^/' + config.token + '/' + config.geoserver.namespace);
var urlFilter = new RegExp('^/' + config.token + '/(.*)');
var geoserverProxy = proxy(config.geoserver.url, {
  filter: function(req) {
    return urlFilter.test(req.url);
  },
  forwardPath: function(req) {
    var url = URL.parse(urlFilter.exec(req.url)[1], Boolean('parse query string'));
    console.log('request coming in is', req.url);
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
    console.log('making request', forward);

    return forward;
  }
});

var geoserver = new express.Router();
geoserver.use(geoserverProxy);

// include routes
require('./routes')(geoserver, {passport: passport});

module.exports = {
  context: config.context,
  express: geoserver
};
