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

  // Grab the user for any endpoint that uses userId
  app.param('userId', function(req, res, next, userId) {
      User.getUserById(userId, function(err, user) {
        if (!user) return res.send('User not found', 404);
        req.user = user;
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
  app.param('layerId', /^\d+$/);  //ensure objectId is a number
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

  app.param('objectId', /^\d+$/);  //ensure objectId is a number
  app.param('objectId', function(req, res, next, objectId) {
    var id = parseInt(objectId, 10);
    req.objectId = id;
    next();
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

  app.param('featureObjectId', /^\d+$/); //ensure featureObjectId is a number
  app.param('featureObjectId', function(req, res, next, objectId) {
    var id = parseInt(objectId, 10);
    req.featureId = id;
    new api.Feature(req.layer).getById({id: id, field: 'properties.OBJECTID'}, function(feature) {
      if (!feature) {
        res.json({
          error: {
            code: 404,
            message: 'Feature (ID: ' + id + ') not found',
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
