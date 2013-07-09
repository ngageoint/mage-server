// Routes responsible for layer managment
module.exports = function(app, auth) {
  var Layer = require('../models/layer')
    , access = require('../access');

  var p***REMOVED***port = auth.p***REMOVED***port;
  var strategy = auth.strategy;

  function LayerResponse() {
    var response = {
      ***REMOVED***Description: 'Situational Analysis GEOINT Environment',
      layers: [],
      tables : []
    };

    var addLayer = function(layer) {
      response.layers.push({
        id: layer.id,
        name: layer.name
      });
    }

    var add = function(layers) {
      if (!layers) return;

      if (Array.isArray(layers)) {
        layers.forEach(function(layer) {
          addLayer(layer);
        });
      } else {
        addLayer(layers);
      }
    }

    var toObject = function() {
      return response;
    }

    return {
      add : add,
      toObject : toObject
    }
  }

  // Get all layers
  app.get(
    '/FeatureServer',
    access.authorize('READ_LAYER'),
    function (req, res) {
      console.log("SAGE Layers GET REST Service Requested");

      Layer.getAll(function (layers) {
        var response = new LayerResponse();
        response.add(layers);
        res.json(response.toObject());
      });
    }
  );

  // Get layer by id
  app.get(
    '/FeatureServer/:layerId',
    access.authorize('READ_LAYER'),
    function(req, res) {
      console.log("SAGE Layers (ID) GET REST Service Requested");

      var layer = req.layer;
      return res.send(layer);
    }
  );

  // Create a new layer
  app.post(
    '/FeatureServer',
    access.authorize('CREATE_LAYER'),
    function(req, res) {
      var name = req.param('name');
      if (!name) {
        res.send(400, "Cannot create layer, invalid parameters.  'name' parameter is required");
      }

      var fields = req.param('fields');

      var layer = {name: name, fields: fields};
      Layer.create(layer, function(err, layer) {
        if (err) {
          res.send(400, err);
          return;
        }

        var response = layer ? layer : {};
        res.json(response);
      });
    }
  );

  // Archive a layer
  app.delete(
    '/FeatureServer/:layerId',
    access.authorize('DELETE_LAYER'),
    function(req, res) {
      console.log("SAGE Layers (ID) DELETE REST Service Requested");

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