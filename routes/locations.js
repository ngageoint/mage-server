module.exports = function(app, security) {
  var moment = require('moment')
    , Location = require('../api').Location
    , Team = require('../models/team')
    , Event = require('../models/event')
    , access = require('../access');

  var passport = security.authentication.passport;
  var location = new Location();

  function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_LOCATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_LOCATION_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function(err, hasPermission) {
        if (hasPermission) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function parseQueryParams(req, res, next) {
    const parameters = {
      filter: {
        eventId: req.event._id
      }
    };

    const startDate = req.param('startDate');
    if (startDate) {
      parameters.filter.startDate = moment.utc(startDate).toDate();
    }

    const endDate = req.param('endDate');
    if (endDate) {
      parameters.filter.endDate = moment.utc(endDate).toDate();
    }

    const lastLocationId = req.param('lastLocationId');
    if (lastLocationId) {
      parameters.filter.lastLocationId = lastLocationId;
    }

    const limit = req.param('limit');
    parameters.limit = limit ? parseInt(limit) : 1;

    parameters.populate = req.query.populate === 'true';

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

      var msg = "";
      var valid = locations.every(function(l) {
        l.properties = l.properties || {};
        if (!l.geometry) {
          msg = "Missing required parameter 'geometry'.";
          return false;
        }

        if (!l.properties.timestamp) {
          msg = "Missing required parameter 'properties.timestamp'";
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

      if (!valid) return res.status(400).send(msg);

      req.locations = locations;

      next();
    });
  }

  // get locations and group by user
  // max of 100 locations per user
  app.get(
    '/api/events/:eventId/locations/users',
    passport.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res) {
      const options = {
        groupByUser: true,
        filter: req.parameters.filter,
        limit: req.parameters.limit,
        populate: req.parameters.populate
      };

      location.getLocations(options, function(err, users) {
        res.json(users);
      });
    }
  );

  // get locations
  // Will only return locations for the teams that the user is a part of
  app.get(
    '/api/events/:eventId/locations',
    passport.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res) {
      var options = {
        filter: req.parameters.filter,
        limit: req.parameters.limit
      };

      location.getLocations(options, function(err, locations) {
        res.json(locations);
      });
    }
  );

  // create new location(s) for a specific user and event
  app.post(
    '/api/events/:eventId/locations',
    passport.authenticate('bearer'),
    access.authorize('CREATE_LOCATION'),
    validateLocations,
    function(req, res, next) {
      location.createLocations(req.locations, req.user, req.event, function(err, locations) {
        if (err) return next(err);

        res.json(locations);
      });
    }
  );
};
