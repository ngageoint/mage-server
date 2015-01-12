module.exports = function(app, security) {
  var Event = require('../models/event')
  , access = require('../access');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
  , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/events*', p***REMOVED***port.authenticate(authenticationStrategy));

  var validateEventParams = function(req, res, next) {
    var event = req.body;

    if (!event.name) {
      return res.send(400, "cannot create event 'name' param not specified");
    }

    req.newEvent = event;
    next();
  }

  var parseQueryParams = function(req, res, next) {
    // var parameters = {};
    // parameters.type = req.param('type');
    //
    // req.parameters = parameters;

    next();
  }

  app.get(
    '/api/events',
    access.authorize('READ_EVENT'),
    parseQueryParams,
    function (req, res) {
      Event.getEvents({}, function (err, events) {
        res.json(events);
      });
    }
  );

  app.get(
    '/api/events/:eventId',
    access.authorize('READ_EVENT'),
    function (req, res) {
      res.json(req.event);
    }
  );


  app.post(
    '/api/events',
    access.authorize('CREATE_EVENT'),
    validateEventParams,
    function(req, res) {
      Event.create(req.newEvent, function(err, event) {
        if (err) {
          return res.send(400, err);
        }

        res.send(201, event);
      });
    }
  );

  app.put(
    '/api/events/:eventId',
    access.authorize('UPDATE_EVENT'),
    validateEventParams,
    function(req, res) {
      Event.update(req.event.id, req.newEvent, function(err, event) {
        if (err) {
          return res.send(400, err);
        }

        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId',
    access.authorize('DELETE_EVENT'),
    function(req, res) {
      Event.remove(req.event, function(err, event) {
        if (err) {
          return res.send(400, err);
        }

        res.send(204);
      });
    }
  );
}
