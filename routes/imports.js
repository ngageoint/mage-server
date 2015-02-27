module.exports = function(app, security) {
  var api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , toGeoJson = require('../utilities/togeojson')

  var verifyLayer = function(req, res, next) {
    if (req.layer.type !== 'Feature') {
      return res.status(400).send("Cannot import data, layer type is not 'Static'");
    }

    return next();
  }

  var readImportFile = function(req, res, next) {
    // TODO at some point open file and determine type (KML, shapefile, geojson, csv)

    fs.readFile(req.files.file.path, 'utf8', function(err, data) {
      req.importData = data;
      return next(err);
    });
  }

  app.post(
    '/api/layers/:layerId/kml',
    access.authorize('CREATE_FEATURE'),
    verifyLayer,
    readImportFile,
    function(req, res, next) {
      var features = toGeoJson.kml(req.importData);
      new api.Feature(req.layer).createFeatures(features, function(err, newFeatures) {
        if (err) return next(err);

        var response = {
          files: [{
            name: req.files.file.name,
            size: req.files.file.size,
            features: newFeatures.length
          }]
        }

        res.json(response);
      });
    }
  );
}
