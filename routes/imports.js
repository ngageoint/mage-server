module.exports = function(app, security) {
  var api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , toGeoJson = require('../utilities/togeojson');

  var passport = security.authentication.passport;

  function verifyLayer(req, res, next) {
    if (req.layer.type !== 'Feature') {
      return res.status(400).send("Cannot import data, layer type is not 'Static'");
    }

    return next();
  }

  function readImportFile(req, res, next) {
    // TODO at some point open file and determine type (KML, shapefile, geojson, csv)

    var file = req.files && req.files.find(o => o.fieldname === "file");
    fs.readFile(file.path, 'utf8', function(err, data) {
      req.importData = data;
      return next(err);
    });
  }

  app.post(
    '/api/layers/:layerId/kml',
    passport.authenticate('bearer'),
    access.authorize('CREATE_LAYER'),
    verifyLayer,
    readImportFile,
    function(req, res, next) {
      var features = toGeoJson.kml(req.importData);
      new api.Feature(req.layer).createFeatures(features)
        .then(newFeatures => {
          var file = req.files && req.files.find(o => o.fieldname === "file");
          var response = {
            files: [{
              name: file.originalname,
              size: file.size,
              features: newFeatures.length
            }]
          };

          res.json(response);
        })
        .catch(err => next(err));
    }
  );
};
