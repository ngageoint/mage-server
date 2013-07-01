module.exports = function(app, models, auth) {
 
  var p***REMOVED***port = auth.p***REMOVED***port;
  var strategy = auth.strategy;

 // Create a new location
  app.post(
    '/api/locations',
    function(req, res) {
      models.Location.createLocation(req.user, function(err, newLocation) {
        if (err) {
          return res.send(400, err);
        }

        res.json(newLocation);
      });
    }
  );
  
  // get all locations
  app.get(
    '/api/locations', 
    function (req, res) {
      models.Location.getLocations(req.user, function (locations) {
        res.json(locations);
      });
  });




}