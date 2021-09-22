module.exports = function(app, security) {
  const fs = require('fs-extra'),
    path = require('path'),
    request = require('request'),
    WMSCapabilities = require('wms-capabilities'),
    DOMParser = require('xmldom').DOMParser,
    Event = require('../models/event'),
    access = require('../access'),
    api = require('../api'),
    environment = require('../environment/env'),
    layerXform = require('../transformers/layer'),
    geopackage = require('../utilities/geopackage'),
    { default: upload } = require('../upload');

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

  async function validateGeopackage(req, res, next) {
    if (req.body.type !== 'GeoPackage') {
      return next();
    }
    if (!req.file) {
      return res.send(400, 'cannot create layer "geopackage" file not specified');
    }

    req.newLayer.state = 'unavailable';

    try {
      const result = await geopackage.open(req.file.path);
      const gp = result.geoPackage;
      if (!gp) {
        // GeoPackage is fatally invalid just send back the errors
        return res.status(400).json(result);
      }
      req.newLayer.geopackage = req.file;
      const validationErrors = await geopackage.validate(gp);
      if (validationErrors && validationErrors.length) {
        req.newLayer.invalid = {
          errors: validationErrors
        };
      }
      gp.close();
      return next();
    } catch (err) {
      return res.status(400).send('cannot create layer, geopackage is not valid ' + err.toString());
    }
  }

  async function processGeoPackage(req, res, next) {
    const layer = req.layer;
    if (layer.type !== 'GeoPackage') {
      return next();
    }
    try {
      const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
      const result = await geopackage.open(geopackagePath);
      const gp = result.geoPackage;
      if (!gp) {
        // GeoPackage is fatally invalid just send back the errors
        return res.status(400).json(result);
      }

      req.geoPackage = gp;
    } catch (err) {
      return res.status(400).send('cannot create layer, geopackage is not valid ' + err.toString());
    }
    layer.state = 'processing';
    const gp = req.geoPackage;
    try {
      layer.tables = geopackage.getTables(gp);
      layer.processing = [];
      for (let i = 0; i < layer.tables.length; i++) {
        const gpLayer = layer.tables[i];

        if (gpLayer.type === 'tile') {
          layer.processing.push({
            layer: gpLayer.name,
            description: '"' + gpLayer.name + '" layer optimization',
            complete: false,
            type: 'tile'
          });
        } else {
          layer.processing.push({
            layer: gpLayer.name,
            description: '"' + gpLayer.name + '" layer index',
            complete: false,
            type: 'feature'
          });
        }
      }
      layer.tables = geopackage.getTables(gp);
      layer.processing = [];
      for (let i = 0; i < layer.tables.length; i++) {
        const gpLayer = layer.tables[i];

        if (gpLayer.type === 'tile') {
          layer.processing.push({
            layer: gpLayer.name,
            description: '"' + gpLayer.name + '" layer optimization',
            complete: false,
            type: 'tile'
          });
        } else {
          layer.processing.push({
            layer: gpLayer.name,
            description: '"' + gpLayer.name + '" layer index',
            complete: false,
            type: 'feature'
          });
        }
      }
      await layer.save();
    } catch (err) {
      gp.close();
      return res.status(400).send('cannot create layer, geopackage is not valid ' + err.toString());
    }

    next();

    // optimize after the layer is returned to the client
    // geopackage.optimize returns a promise and is async
    const layerStatusMap = {};
    for (let i = 0; i < layer.processing.length; i++) {
      layerStatusMap[layer.processing[i].layer] = i;
    }
    
    let currentLayer;
    geopackage
      .optimize(path.join(environment.layerBaseDirectory, layer.file.relativePath), function(progress) {
        if (currentLayer && currentLayer !== progress.layer) {
          const oldLayerStatus = layer.processing[layerStatusMap[currentLayer]];
          oldLayerStatus.complete = true;
          currentLayer = progress.layer;
        }

        const layerStatus = layer.processing[layerStatusMap[progress.layer]];
        layerStatus.count = progress.count;
        layerStatus.total = progress.totalCount;
        layerStatus.description = progress.description;
        layer.save();
      })
      .then(() => {
        return new Promise((resolve) => {
          // GeoPackage file size may have changed after index, update the metadata
          fs.stat(path.join(environment.layerBaseDirectory, layer.file.relativePath))
              .then((stats) => {
                layer.file.size = stats.size;
                resolve()
              });
        })
      })
      .then(() => {
        layer.processing = undefined;
        layer.state = 'available';
        layer.save().then((layer) => {
          console.log('GeoPackage optimized', layer);
        })
        .catch((err) => {
          console.log('err', err);
        });
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

    if (req.param('includeUnavailable')) {
      req.parameters.includeUnavailable = req.param('includeUnavailable');
    }

    next();
  }

  // get all layers
  app.get('/api/layers', 
    access.authorize('READ_LAYER_ALL'), 
    parseQueryParams, 
    function(req, res, next) {
      new api.Layer()
        .getLayers({ includeUnavailable: req.parameters.includeUnavailable })
        .then(layers => {
          const response = layerXform.transform(layers, { path: req.getPath() });
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  app.get('/api/layers/count', access.authorize('READ_LAYER_ALL'), function(req, res, next) {
    new api.Layer()
      .count()
      .then(count => res.json({ count: count }))
      .catch(function(err) {
        next(err);
      });
  });

  app.post('/api/events/:eventId/features',
    passport.authenticate('bearer'),
    validateEventAccess,
    async function(req, res, next) {
      const clientLayers = req.body.layerIds;
      const layerIdMap = {};
      for (let i = 0; i < clientLayers.length; i++) {
        layerIdMap[clientLayers[i].id] = clientLayers[i];
      }
      try {
        const layers = await new api.Layer().getLayers({
          layerIds: Object.keys(layerIdMap),
          type: 'GeoPackage',
          state: 'available'
        });
        const gpLayers = [];
        for (i = 0; i < layers.length; i++) {
          gpLayers.push({
            layer: layers[i],
            table: layerIdMap[layers[i].id].table
          });
        }
        const closest = await geopackage.getClosestFeatures(
          gpLayers,
          Number(req.body.latlng.lat),
          Number(req.body.latlng.lng),
          req.body.tile
        );
        res.json(closest);
        // var response = layerXform.transform(layers, {path: req.getPath()});
        // res.json(response);
      } catch (err) {
        next(err);
      }
    }
  );

  // get features for layer (must be a feature layer)
  app.get('/api/layers/:layerId/features',
    access.authorize('READ_LAYER_ALL'), 
    function(req, res, next) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');

      new api.Feature(req.layer)
        .getAll()
        .then(features => {
          res.json({
            type: 'FeatureCollection',
            features: features.map(f => f.toJSON())
          });
        })
        .catch(err => next(err));
    }
  );

  app.get('/api/layers/:layerId/:tableName/:z(\\d+)/:x(\\d+)/:y(\\d+).:format',
    access.authorize('READ_LAYER_ALL'),
    function(req, res, next) {
      const tileParams = {
        x: Number(req.params.x),
        y: Number(req.params.y),
        z: Number(req.params.z)
      };

      const style = {
        stroke: req.query.stroke,
        fill: req.query.fill,
        width: req.query.width
      };

      const table = req.layer.tables.find(table => table.name === req.params.tableName);
      if (!table) {
        return res.status(404).send('Table does not exist in layer.');
      }
      geopackage
        .tile(req.layer, req.params.tableName, style, tileParams)
        .then(tile => {
          if (!tile) return res.status(404);
          res.contentType('image/jpeg');
          res.send(tile);
        })
        .catch(err => next(err));
    }
  );

  app.get('/api/events/:eventId/layers',
    passport.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res, next) {
      new api.Layer()
        .getLayers({
          layerIds: req.event.layerIds,
          type: req.parameters.type,
          includeUnavailable: req.parameters.includeUnavailable
        })
        .then(layers => {
          const response = layerXform.transform(layers, { path: req.getPath() });
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  // get layer
  app.get('/api/layers/:layerId', 
    access.authorize('READ_LAYER_ALL'), 
    function(req, res) {
      if (req.accepts('application/json')) {
        const response = layerXform.transform(req.layer, { path: req.getPath() });
        res.json(response);
      } else if (req.layer.file) {
        // TODO verify accepts header req.accepts(req.layer.contentType), Android needs to be fixed first
        const stream = fs.createReadStream(path.join(environment.layerBaseDirectory, req.layer.file.relativePath));
        stream.on('open', () => {
          res.type(req.layer.file.contentType);
          res.header('Content-Length', req.layer.file.size);
          stream.pipe(res);
        });
      }
    }
  );

  // get layer
  app.get('/api/events/:eventId/layers/:layerId', 
    passport.authenticate('bearer'), 
    validateEventAccess, 
    function(req,res) {
      if (req.accepts('application/json')) {
        const response = layerXform.transform(req.layer, { path: req.getPath() });
        res.json(response);
      } else if (req.layer.file) {
        // TODO verify accepts header req.accepts(req.layer.contentType), Android needs to be fixed first
        const stream = fs.createReadStream(path.join(environment.layerBaseDirectory, req.layer.file.relativePath));
        stream.on('open', () => {
          res.type(req.layer.file.contentType);
          res.header('Content-Length', req.layer.file.size);
          stream.pipe(res);
        });
      }
    }
  );

  app.get('/api/events/:eventId/layers/:layerId/:tableName/:z(\\d+)/:x(\\d+)/:y(\\d+).:format',
    passport.authenticate('bearer'),
    validateEventAccess,
    function(req, res, next) {
      const tileBuffer = 8;
      const tileParams = {
        x: Number(req.params.x),
        y: Number(req.params.y),
        z: Number(req.params.z)
      };

      const style = {
        stroke: req.query.stroke,
        fill: req.query.fill,
        width: req.query.width
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

          const tileIndex = geojsonvt(featureCollection, { buffer: tileBuffer * 8, maxZoom: tileParams.z });
          const tile = tileIndex.getTile(tileParams.z, tileParams.x, tileParams.y);
          const vectorTile = vtpbf.fromGeojsonVt({ [table.name]: tile || { features: [] } });
          res.contentType('application/x-protobuf');
          res.send(Buffer.from(vectorTile));
        });
      } else {
        geopackage
          .tile(req.layer, req.params.tableName, style, tileParams)
          .then(tile => {
            if (!tile) return res.status(404);
            res.contentType('image/jpeg');
            res.send(tile);
          })
          .catch(err => next(err));
      }
    }
  );

  // get features for layer (must be a feature layer)
  app.get('/api/events/:eventId/layers/:layerId/features',
    passport.authenticate('bearer'),
    validateEventAccess,
    function(req, res, next) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');
      if (req.event.layerIds.indexOf(req.layer._id) === -1)
        return res.status(400).send('layer requested is not in event ' + req.event.name);

      new api.Feature(req.layer)
        .getAll()
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
  app.post('/api/layers',
    access.authorize('CREATE_LAYER'),
    upload.single('geopackage'),
    validateLayerParams,
    function(req, res, next) {
      // If this has a GeoPackage proceed to the next route handler
      if (req.file) {
        return next();
      }
      req.newLayer.state = 'available';
      new api.Layer()
        .create(req.newLayer)
        .then(layer => {
          const response = layerXform.transform(layer, { path: `${req.getPath()}/${layer.id}` });
          return res.location(layer._id.toString()).json(response);
        })
        .catch(err => next(err));
    }
  );

  // Create a new layer
  app.post(
    '/api/layers',
    validateGeopackage,
    function(req, res, next) {
      new api.Layer()
        .create(req.newLayer)
        .then(layer => {
          req.layer = layer;
          if (req.layer.invalid) {
            const response = layerXform.transform(layer, { path: req.getPath() });
            return res.location(layer._id.toString()).json(response);
          }
          return next();
        })
        .catch(err => next(err));
    },
    processGeoPackage,
    function(req, res) {
      const layer = req.layer;
      const response = layerXform.transform(layer, { path: req.getPath() });
      res.location(layer._id.toString()).json(response);
    },
  );

  app.put('/api/layers/:layerId/available',
    access.authorize('UPDATE_LAYER'),
    processGeoPackage,
    function(req, res) {
      const layer = req.layer;
      const response = layerXform.transform(layer, { path: req.getPath() });
      res.status(202).json(response);
    }
  );

  app.put('/api/layers/:layerId', access.authorize('UPDATE_LAYER'), validateLayerParams, function(req, res, next) {
    new api.Layer(req.layer.id)
      .update(req.newLayer)
      .then(layer => {
        const response = layerXform.transform(layer, { path: req.getPath() });
        res.json(response);
      })
      .catch(err => next(err));
  });

  app.post('/api/layers/wms/getcapabilities', function(req, res) {
    request.get({ url: req.body.url + '?SERVICE=WMS&REQUEST=GetCapabilities', gzip: true }, function(
      err,
      response,
      body,
    ) {
      if (err) {
        return res.sendStatus(400);
      }

      const json = new WMSCapabilities(body, DOMParser).toJSON();
      res.json(json);
    });
  });

  app.delete('/api/layers/:layerId', access.authorize('DELETE_LAYER'), function(req, res, next) {
    new api.Layer()
      .remove(req.layer)
      .then(function() {
        res.sendStatus(200);
      })
      .catch(err => next(err));
  });
};
