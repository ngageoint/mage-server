module.exports = function(app, security) {
  var moment = require('moment')
    , Location = require('../models/location')
    , User = require('../models/user')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access')
    , config = require('../config')
    , generate_kml = require('../utilities/generate_kml');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  var locationLimit = config.server.locationServices.userCollectionLocationLimit;

  var parseQueryParams = function(req, res, next) {
    var parameters = {filter: {}};

    var startDate = req.param('startDate');
    if (startDate) {
      parameters.filter.startDate = moment.utc(startDate).toDate();
    }

    var endDate = req.param('endDate');
    if (endDate) {
      parameters.filter.endDate = moment.utc(endDate).toDate();
    }

    var limit = req.param('limit');
    parameters.limit = limit ? parseInt(limit) : 1;

    req.parameters = parameters;

    next();
  }

  var validateLocations = function(req, res, next) {
    var objects = req.body;

    if (!Array.isArray(objects)) {
      objects = [objects];
    }

    var locations = [];
    objects.forEach(function(o) {
      console.log('location ', o);

      if (!o.location) return res.send(400, "Missing required parameter 'location'.");
      if (!o.timestamp) return res.send(400, "Missing required parameter 'timestamp");

      o.location.properties = o.location.properties || {};
      o.location.properties.timestamp = moment.utc(o.timestamp).toDate();
      o.location.properties.user = req.user._id;
      o.location.properties.deviceId = req.provisionedDeviceId;

      o.location.type = "Feature";

      locations.push(o.location);
    });

    req.locations = locations;

    next();
  }

  // get locations
  // Will only return locations for the teams that the user is a part of
  // TODO only one team for PDC, need to implement multiple teams later
  app.get(
    '/api/locations',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('READ_LOCATION'),
    parseQueryParams,
    function(req, res) {
      if (req.parameters.limit > locationLimit) {
        Location.getLocationsWithFilters(req.user, req.parameters.filter, 100000, function(err, users) { 
          res.json(users);
        });
      } else {
        User.getLocations({filter: req.parameters.filter, limit: req.parameters.limit}, function(err, users) {
          res.json(users);
        });
      }
    }
  );

  // create new location(s) for a specific user
  app.post(
    '/api/locations',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('CREATE_LOCATION'),
    validateLocations,
    function(req, res) {
      Location.createLocations(req.user, req.locations, function(err, locations) {
        if (err) {
          return res.send(400, err);
        }
      });

      User.addLocationsForUser(req.user, req.locations, function(err, location) {
        if (err) {
          return res.send(400, err);
        }

        res.json(req.locations);
      })
    }
  );

  // update time on a location
  app.put(
    '/api/locations',
    p***REMOVED***port.authenticate(authenticationStrategy),
    access.authorize('UPDATE_LOCATION'),
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