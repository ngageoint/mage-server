var express = require('express')
  , util = require('util')
  , path = require('path')
  , proxy = require('express-http-proxy')
  , URL = require('url')
  , xmlbuilder = require('xmlbuilder')
  , sldBuilder = require('./sld')
  , config = require('./config')
  , api = require('../../api')
  , Event = require('../../models/event');

var mountPath = config['context'];

// TODO: integrate with authorization
// TODO: figure out mapping of collections to ogc layers - for now layer name is event id.  This will enable us to lookup event info to generate SLD
// TODO: ensure collection->layer mappings using config rest api

var urlFilter = new RegExp('^/wms?');
var geoserverProxy = proxy(config.geoserver.url, {
  filter: function(req) {
    return urlFilter.test(req.url);
  },
  forwardPath: function(req) {
    var url = URL.parse(req.url, Boolean('parse query string'));
    delete url.search;

    if (!url.query['SLD_BODY']) {
      url.query.sld = util.format('%s/ogc/sld?layers=%s', req.getRoot(), url.query['LAYERS']);
    }
    return '/geoserver/' + config.geoserver.namespace + '/ows' + URL.parse(URL.format(url)).path;
  }
});

var app = express();
app.use(geoserverProxy);
app.on('mount', function() {
  console.log('mount path is', app.mountpath);
  mountPath = app.mountpath;
});

// add regex function to parse params
app.param(function(name, fn) {
  if (fn instanceof RegExp) {
    return function(req, res, next, val) {
      var captures;
      if (captures = fn.exec(String(val))) {
        req.params[name] = captures;
        next();
      } else {
        next('route');
      }
    };
  }
});

app.param('eventId', /^[0-9]+$/); //ensure eventId is a number
app.param('eventId', function(req, res, next, eventId) {
  Event.getById(eventId, {populate: false}, function(err, event) {
    if (!event) return res.status(404).send('Event not found');
    req.event = event;
    next();
  });
});

app.param('userId', function(req, res, next, userId) {
  console.log('get user by id', userId);
  new api.User().getById(userId, function(err, user) {
    req.userParam = user;
    next();
  });
});

// TODO protect with authentication
app.get(
  '/icons/observation/:eventId/:type?/:variant?',
  function(req, res, next) {
    console.log('eventId is', req.params.eventId);
    console.log('icon type is', req.params.type);
    console.log('icon variant is', req.params.variant);
    console.log('archived is', req.params.archived);

    new api.Icon(req.event._id, req.params.type, req.params.variant).getIcon(function(err, iconPath) {
      if (err || !iconPath) return next();

      res.sendFile(iconPath);
    });
  }
);

// TODO protect with authentication
app.get(
  '/icons/users/(:userId)?.svg',
  function(req, res) {
    console.log('generate svg file for icon');
    console.log('eventId is', req.params.eventId);
    console.log('userId is', req.params.userId);

    var svg = xmlbuilder.create({
      svg: {
        '@xmlns': 'http://www.w3.org/2000/svg',
        '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
        '@width': '42px',
        '@height': '84px',
        image: {
          '@x': 0,
          '@y': 0,
          '@width': '42px',
          '@height': '42px',
          '@xlink:href': util.format('%s/ogc/icons/users/%s', req.getRoot(), req.params.userId)
        }
      }
    }).end();

    res.send(svg);
  }
);

app.get(
  '/icons/users/:userId/',
  function(req, res, next) {
    console.log('get actual png user icon');
    console.log('userId is', req.params.userId);

    if (!req.userParam) return res.sendStatus(200);

    new api.User().icon(req.userParam, function(err, icon) {
      if (err) return next(err);

      if (!icon || !icon.relativePath) {
        return res.sendFile(path.resolve(__dirname, './img/blank.png'));
      }

      res.sendFile(icon.path);
    });
  }
);

// TODO protect with authentication
app.get(
  '/sld',
  function(req, res) {
    var layers = req.param('layers');
    if (!layers) return res.sendStatus(400);

    console.log('generate sld for', layers);
    console.log('root ', req.getRoot());

    sldBuilder.create(req.getRoot(), layers.split(','), function(err, sld) {
      if (err) {
        console.log('got an error from the observation sld function');
        return res.sendStatus(500);
      }

      console.log('got sld', sld);

      res.send(sld);
    });
  }
);

module.exports = {
  context: mountPath,
  express: app
};
