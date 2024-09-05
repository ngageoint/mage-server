module.exports = function(app, security) {
  const fs = require('fs-extra'),
    path = require('path'),
    request = require('superagent'),
    WMSCapabilities = require('wms-capabilities'),
    DOMParser = require('@xmldom/xmldom').DOMParser,
    access = require('../access'),
    api = require('../api'),
    environment = require('../environment/env'),
    layerXform = require('../transformers/layer'),
    GeoPackageUtility = require('../utilities/geopackage').GeoPackageUtility,
    { defaultHandler: upload } = require('../upload'),
    { defaultEventPermissionsService: eventPermissions } = require('../permissions/permissions.events');

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
    console.log('validate the geopackage')
    if (req.body.type !== 'GeoPackage') {
      return next();
    }
    if (!req.file) {
      return res.send(400, 'cannot create layer "geopackage" file not specified');
    }

    req.newLayer.state = 'unavailable';

    try {
      req.newLayer.geopackage = req.file;
      const validationErrors = await GeoPackageUtility.getInstance().validate(req.file.path);
      if (validationErrors && validationErrors.length) {
        req.newLayer.invalid = {
          errors: validationErrors
        };
      }
      return next();
    } catch (err) {
      return res.status(400).send('Cannot create layer, GeoPackage is not valid ' + err.toString());
    }
  }

  async function processGeoPackage(req, res, next) {
    console.log("process the geopackage")
    const layer = req.layer;
    if (layer.type !== 'GeoPackage') {
      return next();
    }
    const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
    layer.state = 'processing';
    try {
      layer.tables = await GeoPackageUtility.getInstance().getTables(geopackagePath);
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
      layer.tables = await GeoPackageUtility.getInstance().getTables(geopackagePath);
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
      return res.status(400).send('Cannot create layer, GeoPackage is not valid ' + err.toString());
    }

    next();

    // optimize after the layer is returned to the client
    // geopackage.optimize returns a promise and is async
    const layerStatusMap = {};
    for (let i = 0; i < layer.processing.length; i++) {
      layerStatusMap[layer.processing[i].layer] = i;
    }

    let currentLayer;
    GeoPackageUtility.getInstance()
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
          console.log(`error persisting state of layer ${layer._id.toString()} after optimization`, err);
        });
      });
  }

  async function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_LAYER_ALL')) {
      return next();
    }
    if (access.userHasPermission(req.user, 'READ_LAYER_EVENT')) {
      // Make sure I am part of this event
      const hasPermission = await eventPermissions.userHasEventPermission(req.event, req.user.id, 'read')
      if (hasPermission) {
        return next();
      }
    }
    res.sendStatus(403);
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
        for (let i = 0; i < layers.length; i++) {
          gpLayers.push({
            layer: layers[i],
            table: layerIdMap[layers[i].id].table
          });
        }
        const closest = await GeoPackageUtility.getInstance().getClosestFeatures(
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

  /**
   * TODO:
   * This always returns image/png media type, but should return the media type
   * that matches the image format in the geopackage table when the table type
   * is tile.
   */
  function handleGeoPackageXYZTileRequest(req, res, next) {
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
    GeoPackageUtility.getInstance()
    .tile(req.layer, req.params.tableName, style, tileParams)
    .then(tile => {
      if (!tile) return res.sendStatus(404);
      res.contentType('image/png');
      res.send(Buffer.from(tile.split(',')[1], 'base64'))
    })
    .catch(err => next(err));
  }

  app.get('/api/layers/:layerId/:tableName/:z(\\d+)/:x(\\d+)/:y(\\d+).:format',
    access.authorize('READ_LAYER_ALL'),
    handleGeoPackageXYZTileRequest
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

  // get layer file
  app.get(
    '/api/layers/:layerId/file',
    access.authorize('READ_LAYER_ALL'),
    function(req, res) {
      if (!req.layer.file) {
        return res.status(404).send('Layer does not have a file');
      }
      const stream = fs.createReadStream(
        path.join(environment.layerBaseDirectory, req.layer.file.relativePath)
      );
      stream.on('open', () => {
        res.type(req.layer.file.contentType);
        res.header('Content-Length', req.layer.file.size);
        stream.pipe(res);
      });
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
    handleGeoPackageXYZTileRequest
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
          const response = layerXform.transform(layer, { path: `${req.getPath()}/${layer._id.toString()}` });
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

  app.post('/api/layers/wms/getcapabilities', async (req, res) => {
    try {
      const wmsRes = await request.get(`${req.body.url}?SERVICE=WMS&REQUEST=GetCapabilities`);
      const capabilities = new WMSCapabilities(wmsRes.text, DOMParser).toJSON();
      res.json(capabilities);
    }
    catch (err) {
      console.error('error from getcapabilities request:', err);
      res.json(400, { message: String(err) });
    }
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
