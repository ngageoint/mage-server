// Routes responsible for layer managment
module.exports = function(app, models) {

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

  // Grab the layer for any endpoint that uses layerId
  app.param('layerId', function(req, res, next, layerId) {
    models.Layer.getById(layerId, function(layer) {
      if (!layer) {
        res.json({
          error: {
            code: 400, 
            message: "Layer / Table not found: " + layerId
          }
        });
        return;
      }

      req.layer = layer;
      next();
    });
  });

  // Get all layers
  app.get('/FeatureServer', function (req, res) {
    console.log("SAGE Layers GET REST Service Requested");

    models.Layer.getAll(function (layers) {
      var response = new LayerResponse();
      response.add(layers);
      res.json(response.toObject());
    });
  });

  // Get layer by id
  app.get('/FeatureServer/:layerId', function(req, res) {
    console.log("SAGE Layers (ID) GET REST Service Requested");

    var layer = req.layer;
    return res.send(layer);
  });

  // Create a new layer
  app.post('/FeatureServer', function(req, res) {
    var name = req.param('name');
    if (!name) {
      res.send(400, "Cannot create layer, invalid parameters.  'name' parameter is required");
    }

    var fields = req.param('fields');

    var layer = {name: name, fields: fields};
    models.Layer.create(layer, function(err, layer) {
      if (err) {
        res.send(400, err);
        return;
      }

      var response = layer ? layer : {};
      res.json(response);
    });
  });

  // Archive a layer
  app.delete('/FeatureServer/:layerId', function(req, res) {
    console.log("SAGE Layers (ID) DELETE REST Service Requested");

    var layer = req.layer;

    models.Layer.remove(layer, function(err, layer) {
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
  });
}