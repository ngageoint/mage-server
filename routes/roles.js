module.exports = function(app, models, fs, transformers, async, utilities) {
  var p***REMOVED***port = utilities.auth.p***REMOVED***port;
  var strategy = utilities.auth.strategy;

  // get all roles
  app.get(
    '/api/roles', 
    p***REMOVED***port.authenticate(strategy), 
    function (req, res) {
      var roles = models.Role.getRoles();
      return res.json(roles);
    }
  );
}