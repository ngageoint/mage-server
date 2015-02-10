'use strict';

mage.factory('MapService', ['$rootScope', 'mageLib', 'Layer', 'EventService', function ($rootScope, mageLib, Layer, EventService) {
  var ***REMOVED*** = {};

  var layers = {};
  var listeners = [];
  function layersChanged(changed) {
    _.each(listeners, function(listener) {
      changed.added = changed.added || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onLayersChanged)) {
        listener.onLayersChanged(changed);
      }
    });
  }

  function featuresChanged(changed) {
    _.each(listeners, function(listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];
      changed.selected = changed.selected || [];

      if (_.isFunction(listener.onFeaturesChanged)) {
        listener.onFeaturesChanged(changed);
      }
    });
  }

  ***REMOVED***.addListener = function(listener) {
    listeners.push(listener);

    _.each(layers, function(layer, name) {
      layersChanged({ added: [layer] });
    });
  }

  ***REMOVED***.getLayers = function() {
    return layers;
  }



  var rasterLayers = {};
  ***REMOVED***.getRasterLayers = function() {
    return rasterLayers;
  }

  Layer.query(function (layers) {
    var baseLayerFound = false;
    _.each(layers, function(layer) {
      // Add token to the url of all private layers
      // TODO add watch for token change and reset the url for these layers
      if (layer.type === 'Imagery' && layer.url.indexOf('private') == 0) {
        layer.url = layer.url + "?access_token=" + mageLib.getToken();
      }

      if (layer.type === 'Imagery') {
        layer.type = 'raster';

        if (layer.base && !baseLayerFound) {
          layer.options = {selected: true};
          baseLayerFound = true;
        }
      }

    });

    layersChanged({
      added: layers
    });
  });


  var vectorLayers = {};
  // var observationsById = _.indexBy(EventService.getObservations(), 'id');
  // observationsToVectorLayer(_.values(observationsById));

  // ***REMOVED***.getVectorLayers = function() {
  //   return vectorLayers;
  // }

  // function observationsToVectorLayer(observations) {
  //   var geoJson = L.geoJson({
  //     type: 'FeatureCollection',
  //     features: observations
  //   },{
  //     onEachFeature: onEachObservation
  //   });
  //
  //   vectorLayers.observations = {name: 'Observations', group: 'MAGE', layer: geoJson, selected: true};
  // }

  ***REMOVED***.createObservationLayer = function(options) {
    var layer = {
      name: 'Observations',
      group: 'MAGE',
      type: 'geojson',
      options: options
    };

    layers[layer.name] = layer;
    layersChanged({
      added: [layer],
      options: layer.options
    });
  }

  ***REMOVED***.addObservation = function(observation) {
    featuresChanged({
      name: 'Observations',
      added: [observation]
    });
  }

  ***REMOVED***.removeObservation = function(observation) {
    featuresChanged({
      name: 'Observations',
      removed: [observation]
    });
  }

  ***REMOVED***.selectObservation = function(observation) {
    featuresChanged({
      name: 'Observations',
      selected: [observation]
    });
  }

  return ***REMOVED***;
}]);
