module.exports = function(app, security) {
  var fs = require('fs-extra')
    , api = require('../api')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , Layer = require('../models/layer')
    , Feature = require('../models/feature')
    , Icon = require('../models/icon')
    , log = require('winston');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  var resources = {
    layerResource: {
      location: '/FeatureServer',
      featureResource: {
        location: '/features',
        attachmentResource: {
          location: '/attachments'
        },
        stateResource: {
          location: '/states'
        }
      }
    }
  }

  app.set('resources', resources);

  // Protect all FeatureServer routes with token authentication
  app.all('/FeatureServer*', p***REMOVED***port.authenticate(authenticationStrategy, {session: false}));

  app.get('/api', function(req, res) {
    log.info('get api info');
    var config = app.get('config');
    res.json(config.api);
  });

  // Dynamically import all routes
  fs.readdirSync(__dirname).forEach(function(file) {
    if (file[0] == '.' || file === 'index.js') return;
    var route = file.substr(0, file.indexOf('.'));
    require('./' + route)(app, security);
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
      }
    }
  });

  // Grab the user for any endpoint that uses userId
  app.param('eventId', /^[0-9]+$/); //ensure eventId is a number
  app.param('eventId', function(req, res, next, eventId) {
    Event.getById(eventId, function(err, event) {
      if (!event) return res.send('Event not found', 404);
      req.event = event;
      next();
    });
  });

  // Grab the user for any endpoint that uses userId
  app.param('userId', /^[0-9a-f]{24}$/); //ensure userId is a mongo id
  app.param('userId', function(req, res, next, userId) {
    new api.User().getById(userId, function(err, user) {
      if (!user) return res.send('User not found', 404);
      req.userParam = user;
      next();
    });
  });

  // Grab the team for any endpoint that uses teamId
  app.param('teamId', function(req, res, next, teamId) {
    Team.getTeamById(teamId, function(err, team) {
      if (!team) return res.send('Team not found', 404);
      req.team = team;
      next();
    });
  });

  // Grab the icon for any endpoint that uses iconId
  app.param('iconId', function(req, res, next, iconId) {
    Icon.getById(iconId, function(err, icon) {
      if (!icon) return res.send('Icon not found', 404);
      req.icon = icon;
      next();
    });
  });

  // Grab the device for any endpoint that uses deviceId
  app.param('deviceId', function(req, res, next, deviceId) {
      Device.getDeviceById(deviceId, function(err, device) {
        if (!device) return res.send('Device not found', 404);
        req.device = device;
        next();
      });
  });

  // Grab the role for any endpoint that uses roleId
  app.param('roleId', function(req, res, next, roleId) {
      Role.getRoleById(roleId, function(err, role) {
        if (!role) return res.send('Role ' + roleId + ' not found', 404);
        req.role = role;
        next();
      });
  });

  // Grab the layer for any endpoint that uses layerId
  app.param('layerId', function(req, res, next, layerId) {
    Layer.getById(layerId, function(layer) {
      if (!layer) {
        return res.send(400, "Layer / Table not found: ");
      }

      req.layer = layer;
      next();
    });
  });

  // Grab the feature for any endpoint that uses featureId
  app.param('featureId', function(req, res, next, featureId) {
    req.featureId = featureId;
    new api.Feature(req.layer).getById(featureId, function(feature) {
      if (!feature) {
        return res.json(400, 'Feature (ID: ' + featureId + ') not found');
      }

      req.feature = feature;
      next();
    });
  });
}
