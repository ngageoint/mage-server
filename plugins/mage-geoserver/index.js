var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , proxy = require('express-http-proxy')
  , URL = require('url')
  , config = require('./config');

require('./authentication')(passport);

var urlFilter = new RegExp('^/' + config.token + '/' + config.geoserver.namespace);
var geoserverProxy = proxy(config.geoserver.url, {
  filter: function(req) {
    return urlFilter.test(req.url);
  },
  forwardPath: function(req) {
    var url = URL.parse(req.url, Boolean('parse query string'));
    delete url.search;

    if (!url.query['SLD_BODY']) {
      url.query.sld = util.format('%s/ogc/sld?layers=%s&access_token=%s', req.getRoot(), url.query['LAYERS'], config.token);
    }
    return '/geoserver/' + config.geoserver.namespace + '/ows' + URL.parse(URL.format(url)).path;
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
