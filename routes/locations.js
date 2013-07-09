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

    // See if the client provieded a timestamp,
    // if not, set it to now.
    var timestamp = data.timestamp;
    if (!timestamp) {
      timestamp = new Date();
    } else {
      timestamp = moment.utc(timestamp).toDate();
    }

    var location = data.location;
    if (!location) return res.send(400, "Missing required parameter 'location'.");

    location.properties = location.properties || {};
    location.properties.createdOn = location.properties.updatedOn = timestamp;
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
    access.hasPermission('READ_LOCATION'),
    function(req, res) {
      var limit = req.param('limit');
      limit = limit ? limit : 1;

      Location.getLocations(req.user, limit, function(err, locations) {
        res.json(locations);
      });
    }
  );


  app.get(
    '/api/locations/export',
    //p***REMOVED***port.authenticate('bearer'),
    //access.hasPermission('READ_LOCATION'),
    function(req, res) {
      res.writeHead(200,{"Content-Type": "application/vnd.google-earth.kml+xml"});
      res.write(generate_kml.generateKMLHeader());
      res.write(generate_kml.generateKMLDocument());
      res.write(generate_kml.generatePlacemark('point1', 'localhost', 39.83636818,-105.646844,3332.199951));
      res.write(generate_kml.generateKMLDocumentClose());
      res.end(generate_kml.generateKMLClose()); 
    }
  );

  // create a new location for a specific user
  app.post(
    '/api/locations',
    p***REMOVED***port.authenticate('bearer'),
    access.hasPermission('CREATE_LOCATION'),
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
    access.hasPermission('UPDATE_LOCATION'),
    function(req, res) {
      var timestamp = req.param('timestamp');
      if (!timestamp) timestamp = new Date();

      Location.updateLocation(req.user, timestamp, function(err, location) {
        res.json(location);
      });
    }
  );
}