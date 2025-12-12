module.exports = function(app, security) {
  const api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , {defaultHandler: upload} = require('../upload')
    , DOMParser = require('@xmldom/xmldom').DOMParser
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

      const parser = new DOMParser();
      const kml = parser.parseFromString(data, "application/xml");
      const parseError = kml.getElementsByTagName("parsererror");

      if (parseError.length > 0) {
        console.error("KML Parsing Error:", parseError[0].textContent);
      } else {
        console.log("Parsed KML successfully");
      }

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
              name: Buffer.from(req.file.originalname, 'latin1').toString('utf-8'),
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
