module.exports = function(app, models, auth) {
  var p***REMOVED***port = auth.p***REMOVED***port;

  // get all roles
  app.get(
    '/api/roles', 
    p***REMOVED***port.authenticate('bearer'), 
    function (req, res) {
      var roles = models.Role.getRoles();
      return res.json(roles);
    }
  );
}