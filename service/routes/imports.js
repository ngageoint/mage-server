module.exports = function(app, security) {
  var api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , {default: upload} = require('../upload')
    , toGeoJson = require('../utilities/togeojson');

  var passport = security.authentication.passport;

  function verifyLayer(req, res, next) {
    if (req.layer.type !== 'Feature') {
      return res.status(400).send('Cannot import data, layer type is not "Static"');
    }

    if (req.file.mimetype !== 'application/vnd.google-earth.kml+xml') {
      return res.status(400).send('Cannot import data, upload file must be KML');
    }

    return next();
  }

  function readImportFile(req, res, next) {
    fs.readFile(req.file.path, 'utf8', function(err, data) {
      req.importData = data;
      return next(err);
    });
  }

  app.post(
    '/api/layers/:layerId/kml',
    passport.authenticate('bearer'),
    access.authorize('CREATE_LAYER'),
    upload.single('file'),
    verifyLayer,
    readImportFile,
    function(req, res, next) {
      var features = toGeoJson.kml(req.importData);
      new api.Feature(req.layer).createFeatures(features)
        .then(newFeatures => {
          var response = {
            files: [{
              name: req.file.originalname,
              size: req.file.size,
              features: newFeatures.length
            }]
          };

          res.json(response);
        })
        .catch(err => next(err));
    }
  );
};
