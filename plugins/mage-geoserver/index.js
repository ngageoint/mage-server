var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , proxy = require('http-proxy-middleware')
  , URL = require('url')
  , config = require('./config');

require('./authentication')(passport);

var urlFilter = new RegExp('^/' + config.context + '/' + config.token + '/(.*)');
function filter(pathname, req) {
  console.log('req.url: ', req.url);
  console.log('pathname: ', pathname);
  console.log('config context', config.context);
  // console.log('req', req);
  var filter = urlFilter.exec(pathname);
  console.log('filter is', filter);
  return filter;
}

function pathRewrite(path, req) {
  // console.log('request coming in is', req);
  console.log('path coming in is', path);

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
  console.log('making request', forward);

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
