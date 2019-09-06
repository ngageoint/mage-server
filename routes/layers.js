module.exports = function(app, security) {
  const fs = require('fs-extra')
    , path = require('path')
    , geojsonvt = require('geojson-vt')
    , vtpbf = require('vt-pbf')
    , Event = require('../models/event')
    , access = require('../access')
    , api = require('../api')
    , environment = require('../environment/env')
    , layerXform = require('../transformers/layer')
    , geopackage = require('../utilities/geopackage')
    , {default: upload} = require('../upload');

  const passport = security.authentication.passport;
  app.all('/api/layers*', passport.authenticate('bearer'));

  function validateLayerParams(req, res, next) {
    const layer = req.body;

    if (!layer.type) {
      return res.status(400).send('cannot create layer "type" param not specified');
    }

    if (!layer.name) {
      return res.status(400).send('cannot create layer "name" param not specified');
    }

    // TODO error check / validate that if WMS proper things are provided

    req.newLayer = layer;
    next();
  }

  function validateGeopackage(req, res, next) {
    if (req.body.type !== 'GeoPackage') {
      return next();
    }

    if (!req.file) {
      return res.send(400, 'cannot create layer "geopackage" file not specified');
    }

    geopackage.validate(req.file, (err, result) => {
      if (err) return res.status(400).send('cannot create layer, geopackage is not valid');

      req.newLayer.geopackage = req.file;
      req.newLayer.tables = result.metadata.tables;
      next(err);
    });
  }

  function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_LAYER_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_LAYER_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function(err, hasPermission) {
        if (hasPermission) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function parseQueryParams(req, res, next) {
    req.parameters = {
      type: req.param('type')
    };

    next();
  }

  // get all layers
  app.get(
    '/api/layers',
    access.authorize('READ_LAYER_ALL'),
    parseQueryParams,
    function (req, res, next) {
      new api.Layer().getLayers()
        .then(layers => {
          var response = layerXform.transform(layers, {path: req.getPath()});
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  app.get(
    '/api/layers/count',
    access.authorize('READ_LAYER_ALL'),
    function (req, res, next) {
      new api.Layer().count()
        .then(count => res.json({count: count}))
        .catch(function(err) {
          next(err);
        });
    }
  );

  // get features for layer (must be a feature layer)
  app.get(
    '/api/layers/:layerId/features',
    access.authorize('READ_LAYER_ALL'),
    function (req, res, next) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');

      new api.Feature(req.layer).getAll()
        .then(features => {
          res.json({
            type: 'FeatureCollection',
            features: features.map(f => f.toJSON())
          });
        })
        .catch(err => next(err));
    }
  );

  app.get(
    '/api/events/:eventId/layers',
    passport.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res, next) {
      new api.Layer().getLayers({layerIds: req.event.layerIds, type: req.parameters.type})
        .then(layers => {
          var response = layerXform.transform(layers, {path: req.getPath()});
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  // get layer
  app.get(
    '/api/layers/:layerId',
    access.authorize('READ_LAYER_ALL'),
    function (req, res) {
      if (req.accepts('application/json')) {
        const response = layerXform.transform(req.layer, {path: req.getPath()});
        res.json(response);
      } else if (req.accepts('application/octet-stream') && req.layer.file) {
        var stream = fs.createReadStream(path.join(environment.layerBaseDirectory, req.layer.file.relativePath));
        stream.on('open', () => {
          res.type(req.layer.file.contentType);
          res.header('Content-Length', req.layer.file.size);
          stream.pipe(res);
        });
      }
    }
  );

  // get layer
  app.get(
    '/api/events/:eventId/layers/:layerId',
    passport.authenticate('bearer'),
    validateEventAccess,
    function (req, res) {
      if (req.accepts('application/json')) {
        const response = layerXform.transform(req.layer, {path: req.getPath()});
        res.json(response);
      } else if (req.accepts('application/octet-stream') && req.layer.file) {
        var stream = fs.createReadStream(path.join(environment.layerBaseDirectory, req.layer.file.relativePath));
        stream.on('open', () => {
          res.type(req.layer.file.contentType);
          res.header('Content-Length', req.layer.file.size);
          stream.pipe(res);
        });
      }
    }
  );

  app.get(
    '/api/events/:eventId/layers/:layerId/:tableName/:z(\\d+)/:x(\\d+)/:y(\\d+).:format',
    passport.authenticate('bearer'),
    function(req, res, next) {
      const tileBuffer = 8;
      const tileParams = {
        x: Number(req.params.x),
        y: Number(req.params.y),
        z: Number(req.params.z)
      };

      const table = req.layer.tables.find(table => table.name === req.params.tableName);
      if (!table) {
        return res.status(404).send('Table does not exist in layer.');
      }

      if (req.params.format === 'pbf') {
        if (table.type !== 'feature') {
          return res.status(400).send('Cannot request vector tile from a tile layer');
        }

        geopackage.features(req.layer, req.params.tableName, tileParams, tileBuffer, function(err, featureCollection) {
          if (err) return next(err);

          const tileIndex = geojsonvt(featureCollection, {buffer: tileBuffer * 8, maxZoom: tileParams.z});
          const tile = tileIndex.getTile(tileParams.z, tileParams.x, tileParams.y);
          const vectorTile = vtpbf.fromGeojsonVt({ [table.name]: tile || { features: [] } });
          res.contentType('application/x-protobuf');
          res.send(Buffer.from(vectorTile));
        });
      } else {
        geopackage.tile(req.layer, req.params.tableName, tileParams, function(err, tile) {
          if (err) return next(err);
          if (!tile) return res.status(404);
          res.contentType('image/jpeg');
          res.send(tile);
        });
      }
    }
  );

  // get features for layer (must be a feature layer)
  app.get(
    '/api/events/:eventId/layers/:layerId/features',
    passport.authenticate('bearer'),
    validateEventAccess,
    function (req, res, next) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');
      if (req.event.layerIds.indexOf(req.layer._id) === -1) return res.status(400).send('layer requested is not in event ' + req.event.name);

      new api.Feature(req.layer).getAll()
        .then(features => {
          res.json({
            type: 'FeatureCollection',
            features: features.map(f => f.toJSON())
          });
        })
        .catch(err => next(err));
    }
  );

  // Create a new layer
  app.post(
    '/api/layers',
    access.authorize('CREATE_LAYER'),
    upload.single('geopackage'),
    validateLayerParams,
    validateGeopackage,
    function(req, res, next) {
      new api.Layer().create(req.newLayer)
        .then(layer => {
          var response = layerXform.transform(layer, {path: req.getPath()});
          res.location(layer._id.toString()).json(response);
        })
        .catch(err => next(err));
    }
  );

  app.put(
    '/api/layers/:layerId',
    access.authorize('UPDATE_LAYER'),
    validateLayerParams,
    function(req, res, next) {
      new api.Layer(req.layer.id).update(req.newLayer)
        .then(layer => {
          var response = layerXform.transform(layer, {path: req.getPath()});
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  app.delete(
    '/api/layers/:layerId',
    access.authorize('DELETE_LAYER'),
    function(req, res, next) {
      new api.Layer().remove(req.layer)
        .then(function() {
          res.sendStatus(200);
        })
        .catch(err => next(err));
    }
  );
};
