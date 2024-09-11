module.exports = function(app, security) {
  const log = require('../logger');
  const api = require('../api');
  const Event = require('../models/event');
  const Team = require('../models/team');
  const Role = require('../models/role');
  const Device = require('../models/device');
  const Icon = require('../models/icon');
  const { modulesPathsInDir } = require('../utilities/loader');

  // Dynamically import all routes
  modulesPathsInDir(__dirname).forEach(modulePath => {
    const moduleName = modulePath.slice(0, modulePath.indexOf('.'));
    log.debug(`loading ${moduleName} routes from ${modulePath}`);
    const initRoutes = require('./' + moduleName);
    initRoutes(app, security);
  });

  // Grab the event for any endpoint that uses eventId
  app.param('eventId', function(req, res, next, eventId) {
    if (!/^[0-9]+$/.test(eventId)) {
      return res.status(400).send('Invalid event ID in request path');
    }
    Event.getById(eventId, { populate: false }, function(err, event) {
      if (!event) return res.status(404).send('Event not found');
      req.event = event;
      next();
    });
  });

  // Grab the user for any endpoint that uses userId
  app.param('userId', function(req, res, next, userId) {
    if (!/^[0-9a-f]{24}$/.test(userId)) {
      return res.status(400).send('Invalid user ID in request path');
    }
    // TODO: users-next
    new api.User().getById(userId, function(err, user) {
      if (!user) return res.status(404).send('User not found');
      req.userParam = user;
      next();
    });
  });

  // Grab the team for any endpoint that uses teamId
  app.param('teamId', function(req, res, next, teamId) {
    const options = {};
    if (req.query) {
      for (let [key, value] of Object.entries(req.query)) {
        options[key] = value;
      }
    }
    Team.getTeamById(teamId, options, function(err, team) {
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
    new api.Layer()
      .getLayer(layerId)
      .then(layer => {
        if (!layer) {
          return res.status(404).send('Layer not found');
        }

        req.layer = layer;
        next();
      })
      .catch(err => next(err));
  });

  // Grab the feature for any endpoint that uses observationId
  app.param('observationId', function(req, res, next, observationId) {
    req.observationId = observationId;
    // TODO: obs types: use repo
    new api.Observation(req.event).getById(observationId, function(
      err,
      observation
    ) {
      if (err) {
        return next(err);
      }
      if (!observation) {
        return res
          .status(404)
          .send(`Observation ID ${observationId} not found`);
      }
      req.observation = observation;
      next();
    });
  });
};
