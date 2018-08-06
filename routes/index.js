module.exports = function(app, security) {
  var fs = require('fs-extra')
    , extend = require('util')._extend
    , async = require('async')
    , config = require('../config')
    , api = require('../api')
    , User = require('../models/user')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , Role = require('../models/role')
    , Device = require('../models/device')
    , Icon = require('../models/icon')
    , Setting = require('../models/setting');

  app.get('/api', function(req, res, next) {
    async.parallel({
      initial: function(done) {
        User.count(function(err, count) {
          done(err, count === 0);
        });
      },
      disclaimer: function(done) {
        Setting.getSetting('disclaimer')
          .then(disclaimer => done(null, disclaimer || {}))
          .catch(err => done(err));
      }
    }, function(err, results) {
      if (err) return next(err);

      var api = extend({}, config.api);
      api.disclaimer = results.disclaimer.settings;

      if (results.initial) {
        api.initial = true;
      }

      res.json(api);
    });
  });

  // Dynamically import all routes
  fs.readdirSync(__dirname).forEach(function(file) {
    if (file[0] === '.' || file === 'index.js') return;
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
      };
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
    new api.Layer().getLayer(layerId)
      .then(layer => {
        if (!layer) {
          return res.status(404).send("Layer not found");
        }

        req.layer = layer;
        next();
      })
      .catch(err => next(err));
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
};
