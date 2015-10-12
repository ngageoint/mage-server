module.exports = function(app, security) {
  var Layer = require('../models/layer')
    , Event = require('../models/event')
    , access = require('../access')
    , api = require('../api')
    , layerXform = require('../transformers/layer');

  var p***REMOVED***port = security.authentication.p***REMOVED***port;
  app.all('/api/layers*', p***REMOVED***port.authenticate('bearer'));

  var validateLayerParams = function(req, res, next) {
    var layer = req.body;

    if (!layer.type) {
      return res.send(400, "cannot create layer 'type' param not specified");
    }

    if (!layer.name) {
      return res.send(400, "cannot create layer 'name' param not specified");
    }

    // TODO error check / validate that if WMS proper things are provided

    req.newLayer = layer;
    next();
  }

  function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_LAYER_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_LAYER_EVENT')) {
      // Make sure I am part of this event
      Event.eventHasUser(req.event, req.user._id, function(err, eventHasUser) {
        eventHasUser ? next() : res.sendStatus(403);
      });
    } else {
      res.sendStatus(403);
    }
  }

  var parseQueryParams = function(req, res, next) {
    var parameters = {};
    parameters.type = req.param('type');

    req.parameters = parameters;

    next();
  }

  // get all layers
  app.get(
    '/api/layers',
    access.authorize('READ_LAYER_ALL'),
    parseQueryParams,
    function (req, res, next) {
      Layer.getLayers({type: req.parameters.type}, function (err, layers) {
        if (err) return next(err);

        var response = layerXform.transform(layers, {path: req.getPath()});
        res.json(response);
      });
    }
  );

  app.get(
    '/api/layers/count',
    access.authorize('READ_LAYER_ALL'),
    function (req, res, next) {
      Layer.count(function (err, count) {
        if (err) return next(err);

        res.json({count: count});
      });
    }
  );

  // get features for layer (must be a feature layer)
  app.get(
    '/api/layers/:layerId/features',
    access.authorize('READ_LAYER_ALL'),
    function (req, res) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');

      new api.Feature(req.layer).getAll(function(err, features) {
        features = features.map(function(f) { return f.toJSON(); });
        res.json({
          type: 'FeatureCollection',
          features: features
        });
      });
    }
  );


  app.get(
    '/api/events/:eventId/layers',
    validateEventAccess,
    parseQueryParams,
    function(req, res, next) {
      Layer.getLayers({layerIds: req.event.layerIds, type: req.parameters.type}, function(err, layers) {
        var response = layerXform.transform(layers, {path: req.getPath()});
        res.json(response);
      });
    }
  );

  // get layer
  app.get(
    '/api/layers/:layerId',
    access.authorize('READ_LAYER_ALL'),
    function (req, res) {
      var response = layerXform.transform(req.layer, {path: req.getPath()});
      res.json(response);
    }
  );

  // get features for layer (must be a feature layer)
  app.get(
    '/api/events/:eventId/layers/:layerId/features',
    validateEventAccess,
    function (req, res) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');
      if (req.event.layerIds.indexOf(req.layer._id) === -1) return res.status(400).send('layer requested is not in event ' + req.event.name);

      new api.Feature(req.layer).getAll(function(err, features) {
        features = features.map(function(f) { return f.toJSON(); });
        res.json({
          type: 'FeatureCollection',
          features: features
        });
      });
    }
  );

  // Create a new layer
  app.post(
    '/api/layers',
    access.authorize('CREATE_LAYER'),
    validateLayerParams,
    function(req, res, next) {
      Layer.create(req.newLayer, function(err, layer) {
        if (err) return next(err);

        var response = layerXform.transform(layer, {path: req.getPath()});
        res.location(layer._id.toString()).json(response);
      });
    }
  );

  // Update a layer
  app.put(
    '/api/layers/:layerId',
    access.authorize('UPDATE_LAYER'),
    validateLayerParams,
    function(req, res, next) {
      Layer.update(req.layer.id, req.newLayer, function(err, layer) {
        if (err) return next(err);

        var response = layerXform.transform(layer, {path: req.getPath()});
        res.json(response);
      });
    }
  );

  // Archive a layer
  app.delete(
    '/api/layers/:layerId',
    access.authorize('DELETE_LAYER'),
    function(req, res) {
      var layer = req.layer;

      Layer.remove(layer, function(err, layer) {
        response = {};
        if (err) {
          response.success = false;
          response.message = err;
        } else {
          response.succes = true;
          response.message = 'Layer ' + layer.name + ' has been removed.'
        }

        res.json(response);
      });
    }
  );
}
