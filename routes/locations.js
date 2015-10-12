module.exports = function(app, security) {
  var moment = require('moment')
    , log = require('winston')
    , Location = require('../models/location')
    , CappedLocation = require('../models/cappedLocation')
    , Team = require('../models/team')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , access = require('../access')
    , config = require('../config');

  var p***REMOVED***port = security.authentication.p***REMOVED***port;
  var locationLimit = config.server.locationServices.userCollectionLocationLimit;

  function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_LOCATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_LOCATION_EVENT')) {
      // Make sure I am part of this event
      Event.eventHasUser(req.event, req.user._id, function(err, eventHasUser) {
        eventHasUser ? next() : res.sendStatus(403);
      });
    } else {
      res.sendStatus(403);
    }
  }

  function parseQueryParams(req, res, next) {
    var parameters = {filter: {}};

    var startDate = req.param('startDate');
    if (startDate) {
      parameters.filter.startDate = moment.utc(startDate).toDate();
    }

    var endDate = req.param('endDate');
    if (endDate) {
      parameters.filter.endDate = moment.utc(endDate).toDate();
    }

    var lastLocationId = req.param('lastLocationId');
    if (lastLocationId) {
      parameters.filter.lastLocationId = lastLocationId;
    }

    var limit = req.param('limit');
    parameters.limit = limit ? parseInt(limit) : 1;

    req.parameters = parameters;

    next();
  }

  function validateLocations(req, res, next) {
    var locations = req.body;

    if (!Array.isArray(locations)) {
      locations = [locations];
    }

    Team.teamsForUserInEvent(req.user, req.event, function(err, teams) {
      if (err) return next(err);

      if (teams.length === 0) {
        return res.status(403).send('Cannot submit a location for an event that you are not part of.');
      }

      req.user.teamIds = teams.map(function(team) { return team._id; });

      var valid = locations.every(function(l) {
        if (!l.geometry) {
          msg = "Missing required parameter 'geometry'.";
          return false;
        }

        if (!l.properties || !l.properties.timestamp) {
          msg = "Missing required parameter 'properties.timestamp";
          return false;
        }

        l.userId = req.user._id;
        l.eventId = req.event._id;
        l.teamIds = req.user.teamIds;
        l.properties.timestamp = moment.utc(l.properties.timestamp).toDate();
        l.properties.deviceId = req.provisionedDeviceId;

        l.type = "Feature";

        return true;
      });

      if (!valid) return res.send(400, msg);

      req.locations = locations;

      next();
    });
  }

  // get locations and group by user
  // max of 100 locations per user
  app.get(
    '/api/events/:eventId/locations/users',
    p***REMOVED***port.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res) {
      var filter = req.parameters.filter;
      filter.eventId = req.event._id;
      CappedLocation.getLocations({filter: filter, limit: req.parameters.limit}, function(err, users) {
        res.json(users);
      });
    }
  );

  // get locations
  // Will only return locations for the teams that the user is a part of
  // TODO only one team for PDC, need to implement multiple teams later
  app.get(
    '/api/events/:eventId/locations',
    p***REMOVED***port.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res) {
      var filter = req.parameters.filter;
      filter.eventId = req.event._id;
      Location.getLocations({filter: req.parameters.filter, limit: req.parameters.limit}, function(err, locations) {
        res.json(locations);
      });
    }
  );

  // create new location(s) for a specific user and event
  app.post(
    '/api/events/:eventId/locations',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('CREATE_LOCATION'),
    validateLocations,
    function(req, res) {
      var currentTimestamp = moment();
      var validLocations = [];
      var futureLocations = [];
      req.locations.forEach(function(location) {
        var timestamp = moment(location.properties.timestamp);
        timestamp.diff(currentTimestamp, 'minutes') > 15 ? futureLocations.push(location) : validLocations.push(location);
      });

      Location.createLocations(validLocations, function(err, locations) {
        if (err) {
          return res.send(400, err);
        }

        res.json(locations);
      });

      CappedLocation.addLocations(req.user, req.event, {valid: validLocations, future: futureLocations}, function(err, location) {
        if (err) {
          log.error('failed to store location in capped location collection');
        }
      });
    }
  );

  // update time on a location
  app.put(
    '/api/events/:eventId/locations',
    p***REMOVED***port.authenticate('bearer'),
    validateEventAccess,
    function(req, res) {
      var data = req.body;

      // See if the client provieded a timestamp,
      // if not, set it to now.
      if (!data.timestamp) return res.send(400, "Missing required parameter 'timestamp");
      var timestamp = moment.utc(timestamp).toDate();

      Location.updateLocation(req.user, timestamp, function(err, location) {
        res.json(location);
      });
    }
  );
}
