module.exports = function(app, auth) {
  var moment = require('moment')
    , Location = require('../models/location')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access')
    , generate_kml = require('../utilities/generate_kml');

  var p***REMOVED***port = auth.p***REMOVED***port;

  var validateLocation = function(req, res, next) {
    var data = req.body;

    var location = data.location;
    if (!location) return res.send(400, "Missing required parameter 'location'.");

    location.properties = location.properties || {};
    location.properties.createdOn = location.properties.updatedOn = moment.utc(data.timestamp).toDate();
    location.properties.user = req.user._id;

    console.log(JSON.stringify(location));
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
      limit = limit ? limit : 1;

      Location.getLocations(req.user, limit, function(err, locations) {
        res.json(locations);
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

        res.json(location);
      });
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
      var timestamp = timestamp = moment.utc(timestamp).toDate();


      Location.updateLocation(req.user, timestamp, function(err, location) {
        res.json(location);
      });
    }
  );
}