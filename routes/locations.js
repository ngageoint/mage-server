module.exports = function(app, auth) {
  var Location = require('../models/location')
    , Token = require('../models/token')
    , Role = require('../models/role')
    , Team = require('../models/team')
    , access = require('../access');

  var access == require('../access')
    , Location = require('../models/location');

  var p***REMOVED***port = auth.p***REMOVED***port;
  var strategy = auth.strategy;

  // get all locations
  app.get(
    '/api/locations',
    access.hasPermissoin('READ_LOCATION'),
    function (req, res) {
      Location.getLocations(req.user, function (err, locations) {
        res.json(locations);
      });
  });

 // create a new location
  app.post(
    '/api/locations',
    access.hasPermission('CREATE_LOCATION'),
    function(req, res) {
      Location.createLocation(req.user, function(err, newLocation) {
        if (err) {
          return res.send(400, err);
        }

        res.json(newLocation);
      });
    }
  );

  // update time on a location
}