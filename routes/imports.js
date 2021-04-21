module.exports = function(app, security) {
  const api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , {default: upload} = require('../upload')
    , DOMParser = require('xmldom').DOMParser
    , toGeoJson = require('../utilities/togeojson');

  const passport = security.authentication.passport;

  function validate(req, res, next) {
    if (req.layer.type !== 'Feature') {
      return res.status(400).send('Cannot import data, layer type is not "Static".');
    }

    if (!req.file) {
      return res.status(400).send('Invalid file, please upload a KML file.');
    }

    fs.readFile(req.file.path, 'utf8', function (err, data) {
      if (err) return next(err);

      const kml = new DOMParser({
        errorHandler: () => { /* ignore */ }
      }).parseFromString(data);

      if (!kml || kml.documentElement.nodeName !== 'kml') {
        return res.status(400).send('Invalid file, please upload a KML file.');
      }

      req.kml = kml;
      return next();
    });
  }

  app.post(
    '/api/layers/:layerId/kml',
    passport.authenticate('bearer'),
    access.authorize('CREATE_LAYER'),
    upload.single('file'),
    validate,
    function(req, res, next) {
      const features = toGeoJson.kml(req.kml);
      new api.Feature(req.layer).createFeatures(features)
        .then(newFeatures => {
          const response = {
            files: [{
              name: req.file.originalname,
              size: req.file.size,
              features: newFeatures ? newFeatures.length : 0
            }]
          };

          res.json(response);
        })
        .catch(err => next(err));
    }
  );
};
