module.exports = function(app, models, fs, transformers, async, utilities) {
  var p***REMOVED***port = auth.p***REMOVED***port;
  var strategy = auth.strategy;

  // get all roles
  app.get(
    '/api/roles', 
    p***REMOVED***port.authenticate(strategy), 
      function (req, res) {
        var roles = models.Roles.getRoles();
        return res.json(roles);
      }
  });
}