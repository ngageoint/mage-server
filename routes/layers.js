module.exports = function(app, security) {
  var Layer = require('../models/layer')
    , Event = require('../models/event')
    , access = require('../access')
    , api = require('../api');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/layers*', p***REMOVED***port.authenticate(authenticationStrategy));

  var getLayerResource = function(req) {
    // TODO once this is event clean up, should not have a different
    // route to get layers/events.  It should be the /api/<layers> or /api/<events>
    return req.getPath() + '/FeatureServer';
  }

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
    function (req, res) {
      Layer.getLayers({type: req.parameters.type}, function (err, layers) {
        var path = getLayerResource(req);
        res.json(layers.map(function(layer) {
          if (layer.type === 'External' || layer.type === 'Feature') layer.url = [path, layer.id].join("/");
          return layer;
        }));
      });
    }
  );

  app.get(
    '/api/events/:eventId/layers',
    validateEventAccess,
    function(req, res, next) {
      Layer.getLayers({layerIds: req.event.layerIds}, function(err, layers) {
        var path = getLayerResource(req);
        res.json(layers.map(function(layer) {
          if (layer.type === 'External' || layer.type === 'Feature') layer.url = [path, layer.id].join("/");
          return layer;
        }));
      });
    }
  );

  // get layer
  app.get(
    '/api/layers/:layerId',
    access.authorize('READ_LAYER'),
    function (req, res) {
      res.json(req.layer);
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
    function(req, res) {
      Layer.create(req.newLayer, function(err, layer) {
        if (err) {
          return res.send(400, err);
        }

        res.json(layer);
      });
    }
  );

  // Update a layer
  app.put(
    '/api/layers/:layerId',
    access.authorize('UPDATE_LAYER'),
    validateLayerParams,
    function(req, res) {
      Layer.update(req.layer.id, req.newLayer, function(err, layer) {
        if (err) {
          return res.send(400, err);
        }

        res.json(layer);
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
