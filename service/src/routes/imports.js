module.exports = function (app, security) {
  const api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , Zip = require('adm-zip')
    , { defaultHandler: upload } = require('../upload')
    , DOMParser = require('@xmldom/xmldom').DOMParser
    , toGeoJson = require('../utilities/togeojson');

  const passport = security.authentication.passport;

  function validate(req, res, next) {
    if (req.layer.type !== 'Feature') {
      return res.status(400).send('Cannot import data, layer type is not "Static".');
    }

    if (!req.file) {
      return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
    }

    const fileExtension = req.file.originalname.toLowerCase().split('.').pop();

    if (fileExtension === 'kmz') {
      try {
        const zip = new Zip(req.file.path);
        const zipEntries = zip.getEntries();
        const kmlEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.kml'));

        if (!kmlEntry) {
          return res.status(400).send('No KML file found inside.');
        }

        const kmlData = kmlEntry.getData().toString('utf8');
        processKmlData(kmlData, req, res, next);
      } catch (err) {
        return res.status(400).send('Unable to extract contents from KMZ file.');
      }
    } else if (fileExtension === 'kml') {
      fs.readFile(req.file.path, 'utf8', function (err, data) {
        if (err) return next(err);
        processKmlData(data, req, res, next);
      });
    } else {
      return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
    }
  }

  function processKmlData(data, req, res, next) {
    const parser = new DOMParser();
    const kml = parser.parseFromString(data, "application/xml");
    const parseError = kml.getElementsByTagName("parsererror");

    if (parseError.length > 0) {
      console.error("KML Parsing Error:", parseError[0].textContent);
    } else {
      console.log("Parsed KML successfully");
    }

    if (!kml || kml.documentElement.nodeName !== 'kml') {
      return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
    }

    req.kml = kml;
    return next();
  }

  app.post(
    '/api/layers/:layerId/kml',
    passport.authenticate('bearer'),
    access.authorize('CREATE_LAYER'),
    upload.single('file'),
    validate,
    function (req, res, next) {
      console.log('Importing KML file:', req.file.originalname);
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
