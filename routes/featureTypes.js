module.exports = function(app, auth) {

  feature_types = require('../utilities/feature_types');  

  // get all feature types
  app.get(
    '/api/feature/types', 
    function (req, res) {
      return res.send(200,feature_types.getTypes());
    }
  );

}