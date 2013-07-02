module.exports = function(app, auth) {
  var Location = require('../models/location')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access');

  var p***REMOVED***port = auth.p***REMOVED***port;

  var validateLocation = function(req, res, next) {
    var location = req.body;

    // See if the client provieded a timestamp,
    // if not, set it to now.
    var timestamp = location.timestamp;
    if (!timestamp) timestamp = new Date();

    var point = location.point;
    if (!point) return res.send(400, "Missing required parameter 'point'.");

    var properties = point.properties ? point.properties : {};
    properties.createdOn = properties.updatedOn = timestamp;
    properties.user = req.user._id;

    req.locationFeature = {
      type: 'Feature',
      geometry: point,
      properties: properties
    };

    next();
  }

  // get all locations
  // app.get(
  //   '/api/locations',
  //   p***REMOVED***port.authenticate('bearer'),
  //   access.hasPermission('READ_LOCATION'),
  //   function (req, res) {
  //     Location.getLocations(function (err, locations) {
  //       res.json(locations);
  //     });
  // });

  // get locations
  // Will only return locations for the teams that the user is a part of
  // TODO only one team for PDC, need to implement multiple teams later
  app.get(
    '/api/locations',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('READ_LOCATION'),
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
    access.hasPermission('CREATE_LOCATION'),
    validateLocation,
    function(req, res) {
      Location.createLocation(req.user, req.locationFeature, function(err, location) {
        if (err) {
          return res.send(400, err);
        }

        res.json(location);
      });
    }
  );

  // update time on a location
}