module.exports = function(app, auth) {
  var fs = require('fs-extra')
    , Team = require('../models/team')
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , Layer = require('../models/layer')
    , Feature = require('../models/feature');

  // TODO tmp error calls to test error handling
  app.get('/api/error/null', function(req, res, next) {
    var test = null;
    test.doesNotExist;
  });

  app.get('/api/error/error', function(req, res, next) {
    var error = new Error('Some general error message here');
    throw(error);
  });

  app.get('/api/error/callback', function(req, res, next) {
    fs.readdir(__dirname, function() {
      var error = new Error('In callback: some general error message here');
      throw(error);
    });
  });

  // Protect all FeatureServer routes with token authentication
  app.all('/FeatureServer*', auth.p***REMOVED***port.authenticate('bearer', {session: false}));

  // Dynamically import all routes
  fs.readdirSync(__dirname).forEach(function(file) {
    if (file[0] == '.' || file === 'index.js') return;
    var route = file.substr(0, file.indexOf('.'));
    require('./' + route)(app, auth);
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

  // Grab the layer for any endpoint that uses layerId
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


  // Grab the feature for any endpoint that uses featureObjectId
  app.param('featureObjectId', /^\d+$/); //ensure featureObjectId is a number
  app.param('featureObjectId', function(req, res, next, objectId) {
    var id = parseInt(objectId, 10);
    Feature.getFeatureByObjectId(req.layer, id, function(feature) {
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