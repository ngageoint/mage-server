var fs = require('fs')
  , api = require('../../../api')
  , Event = require('../../../models/event');

module.exports = function(app, security) {
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
      req.userParam = user;
      next();
    });
  });

  // Grab the user for any endpoint that uses userId
  app.param('observationId', /^[0-9a-f]{24}$/); //ensure userId is a mongo id
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
