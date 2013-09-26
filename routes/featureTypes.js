module.exports = function(app, security) {

  featureTypes = require('../models/featureType');  

  // get all feature types
  app.get(
    '/api/feature/types', 
    function (req, res) {
      return res.send(200,featureTypes.getFeatureTypes());
    }
  );

}