module.exports = function(app, auth) {
  var Layer = require('../models/layer')
    , access = require('../access');

  var p***REMOVED***port = auth.p***REMOVED***port;

  app.all('/api/layers*', p***REMOVED***port.authenticate('bearer'));

  var validateLayerParams = function(req, res, next) {
    var layer = {};

    var type = req.param('type');
    if (!type) {
      return res.send(400, "cannot create layer 'type' param not specified");
    }
    layer.type = type;

    var name = req.param('name');
    if (!name) {
      return res.send(400, "cannot create layer 'name' param not specified");
    }
    layer.name = name;

    var format = req.param('format');
    if (format) layer.format = format;

    var url = req.param('url');
    if (url) layer.url = url;

    var description = req.param('description');
    if (description) layer.description = description;

    req.newLayer = layer;
    next();
  }

  // get all layers
  app.get(
    '/api/layers', 
    access.authorize('READ_LAYER'),
    function (req, res) {
      Layer.getLayers(function (err, layers) {
        res.json(layers);
      });
    }
  );

  // get layer
  app.get(
    '/api/layers/:layerId', 
    access.authorize('READ_LAYER'), 
    function (req, res) {
      res.json(req.team);
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
      Layer.update(req.newLayer, update, function(err, layer) {
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