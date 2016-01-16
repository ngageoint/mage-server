module.exports = function(app, security) {
  var fs = require('fs-extra')
    , async = require('async')
    , api = require('../api')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , User = require('../models/user')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , Layer = require('../models/layer')
    , Observation = require('../models/observation')
    , Icon = require('../models/icon')
    , Setting = require('../models/setting')
    , log = require('winston');

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

  var log = require('winston');

  app.set('resources', resources);

  app.get('/api', function(req, res, next) {
    async.parallel({
      initial: function(done) {
        User.count(function(err, count) {
          console.log('users in mongo', count);
          done(err, count === 0);
        });
      },
      disclaimer: function(done) {
        Setting.getSetting('disclaimer', function(err, disclaimer) {
          done(err, disclaimer || {});
        });
      }
    }, function(err, results) {
      if (err) return next(err);

      var api = app.get('config').api;
      api.disclaimer = results.disclaimer.settings;

      if (results.initial) {
        api.initial = true;
      }

      console.log('returning api', api);
      res.json(api);
    });
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

  // Grab the user for any endpoint that uses eventId
  app.param('eventId', /^[0-9]+$/); //ensure eventId is a number
  app.param('eventId', function(req, res, next, eventId) {
    Event.getById(eventId, {populate: false}, function(err, event) {
      if (!event) return res.status(404).send('Event not found');
      req.event = event;
      next();
    });
  });

  // Grab the user for any endpoint that uses userId
  app.param('userId', /^[0-9a-f]{24}$/); //ensure userId is a mongo id
  app.param('userId', function(req, res, next, userId) {
    new api.User().getById(userId, function(err, user) {
      if (!user) return res.status(404).send('User not found');
      req.userParam = user;
      next();
    });
  });

  // Grab the team for any endpoint that uses teamId
  app.param('teamId', function(req, res, next, teamId) {
    Team.getTeamById(teamId, function(err, team) {
      if (!team) return res.status(404).send('Team not found');
      req.team = team;
      next();
    });
  });

  // Grab the icon for any endpoint that uses iconId
  app.param('iconId', function(req, res, next, iconId) {
    Icon.getById(iconId, function(err, icon) {
      if (!icon) return res.status(404).send('Icon not found');
      req.icon = icon;
      next();
    });
  });

  // Grab the device for any endpoint that uses deviceId
  app.param('deviceId', function(req, res, next, deviceId) {
      Device.getDeviceById(deviceId, function(err, device) {
        if (!device) return res.status(404).send('Device not found');
        req.device = device;
        next();
      });
  });

  // Grab the role for any endpoint that uses roleId
  app.param('roleId', function(req, res, next, roleId) {
      Role.getRoleById(roleId, function(err, role) {
        if (!role) return res.status(404).send('Role ' + roleId + ' not found');
        req.role = role;
        next();
      });
  });

  // Grab the layer for any endpoint that uses layerId
  app.param('layerId', function(req, res, next, layerId) {
    Layer.getById(layerId, function(layer) {
      if (!layer) {
        return res.staus(404).send("Layer not found: ");
      }

      req.layer = layer;
      next();
    });
  });

  // Grab the feature for any endpoint that uses observationId
  app.param('observationId', function(req, res, next, observationId) {
    req.observationId = observationId;
    new api.Observation(req.event).getById(observationId, function(err, observation) {
      if (err) return next(err);

      if (!observation) return res.status(404).send('Observation (ID: ' + observationId + ') not found');

      req.observation = observation;
      next();
    });
  });
}
