var express = require('express')
  , proxy = require('express-http-proxy')
  , URL = require('url');

var config = require('./config');
console.log('config is', config);
var mountPath = config['context'];

// TODO: integrate with authorization
// TODO: figure out mapping of collections to ogc layers - more friendly layer names?
// TODO: ensure collection->layer mappings using config rest api

var urlFilter = new RegExp('^/\\?');

var geoserverProxy = proxy(config.geoserver.url, {
  // filter: function(req) {
  //   var filter = urlFilter.test(req.url);
  //   console.log('req url', req.url);
  //
  //   console.log('filtering the req', filter);
  //   return filter;
  // },
  forwardPath: function(req) {
    var url = URL.parse(req.url, Boolean('parse query string'));
    var reqPath = url.path;
    console.log('generating the req path', '/geoserver/' + config.geoserver.namespace + '/ows' + reqPath);
    return '/geoserver/' + config.geoserver.namespace + '/ows' + reqPath;
  }
});

var app = express();
app.use(geoserverProxy);
app.on('mount', function() {
  console.log('mount path is', app.mountpath);
  mountPath = app.mountpath;
});

// app.get('/test', function (req, res) {
//   res.json({status: 400, message: 'test successful'});
// });

module.exports = {
  context: mountPath,
  express: app
};
