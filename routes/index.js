module.exports = function(app, security) {
  var fs = require('fs-extra')
    , api = require('../api')
    , Team = require('../models/team')
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , Layer = require('../models/layer')
    , Feature = require('../models/feature');

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

  // Protect everthing in the private directory
  app.all('/private/*', p***REMOVED***port.authenticate(authenticationStrategy), function(req, res, next) {
    return next();
  });

  // Protect all FeatureServer routes with token authentication
  app.all('/FeatureServer*', p***REMOVED***port.authenticate(authenticationStrategy, {session: false}));

  app.get('/api', function(req, res) {
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

  // Grab the team for any endpoint that uses teamId
  app.param('teamId', function(req, res, next, teamId) {
      Team.getTeamById(teamId, function(err, team) {
        if (!team) return res.send('Team not found', 404);
        req.team = team;
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

  // Grab the ESRI feature layer for any endpoint that uses layerId
  app.param('layerId', function(req, res, next, layerId) {
    Layer.getById(layerId, function(layer) {
      if (!layer) {
        res.json({
          error: {
            code: 400, 
            message: "Layer / Table not found: " + layerId
          }
        });
        return;
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
        res.json({
          error: {
            code: 404,
            message: 'Feature (ID: ' + featureId + ') not found',
            details: []
          }
        });
        return;
      }

      req.feature = feature;
      next();
    });   
  });  
}