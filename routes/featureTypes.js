module.exports = function(app, security) {

  featureTypes = require('../models/featureType');  

  // get all feature types
  app.get(
    '/api/feature/types', 
    function (req, res) {
    	var type = req.query.type;
      if (!type) {
        return res.send(400, 'type parameter is required');
      }

      return res.json(featureTypes.getFeatureTypes(type));
    }
  );

}