module.exports = function(app, auth) {
  var moment = require('moment')
    , Location = require('../models/location')
    , User = require('../models/user')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access')
    , config = require('../config')
    , generate_kml = require('../utilities/generate_kml');

  var p***REMOVED***port = auth.p***REMOVED***port;

  var validateLocation = function(req, res, next) {
    var data = req.body;

    var location = data.location;
    if (!location) return res.send(400, "Missing required parameter 'location'.");

    var timestamp = data.timestamp;
    if (!timestamp) return res.send(400, "Missing required parameter 'timestamp");

    location.properties = location.properties || {};
    location.properties.createdOn = location.properties.updatedOn = moment.utc(data.timestamp).toDate();
    location.properties.user = req.user._id;

    req.location = location;

    next();
  }

  // get locations
  // Will only return locations for the teams that the user is a part of
  // TODO only one team for PDC, need to implement multiple teams later
  app.get(
    '/api/locations',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('READ_LOCATION'),
    function(req, res) {
      var limit = req.param('limit');
      limit = limit ? parseInt(limit) : 1;

      User.getLocations({limit: limit}, function(err, users) {
        res.json(users);
      });
    }
  );

  // create a new location for a specific user
  app.post(
    '/api/locations',
    p***REMOVED***port.authenticate('bearer'),
    access.authorize('CREATE_LOCATION'),
    validateLocation,
    function(req, res) {
      Location.createLocation(req.user, req.location, function(err, location) {
        if (err) {
          return res.send(400, err);
        }
      });

      User.addLocationForUser(req.user, req.location, function(err, location) {
        if (err) {
          return res.send(400, err);
        }

        res.json(req.location);
      })
    }
  );

  // update time on a location
  app.put(
    '/api/locations',
    p***REMOVED***port.authenticate('bearer'),
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