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

      if (_.isFunction(listener.onFeaturesChanged)) {
        listener.onFeaturesChanged(changed);
      }
    });
  }

  function featureSelected(selected) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFeatureSelected)) {
        listener.onFeatureSelected(selected);
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

  ***REMOVED***.createRasterLayer = function(layer) {
    layersChanged({
      added: [layer]
    });
  }

  ***REMOVED***.createVectorLayer = function(layer) {
    layers[layer.name] = layer;
    layersChanged({
      added: [layer]
    });
  }

  ***REMOVED***.createMarker = function(marker, options) {
    if (options) marker.options = options;

    layersChanged({
      name: marker.id,
      added: [marker]
    });
  }

  ***REMOVED***.removeMarker = function(marker, markerId) {
    layersChanged({
      name: markerId,
      removed: [marker]
    });
  }

  ***REMOVED***.updateMarker = function(marker, markerId) {
    layersChanged({
      name: markerId,
      updated: [marker]
    });
  }

  ***REMOVED***.addFeatureToLayer = function(feature, layerId) {
    featuresChanged({
      name: layerId,
      added: [feature]
    });
  }

  ***REMOVED***.updateFeatureForLayer = function(feature, layerId) {
    featuresChanged({
      name: layerId,
      updated: [feature]
    });
  }

  ***REMOVED***.removeFeatureFromLayer = function(feature, layerId) {
    featuresChanged({
      name: layerId,
      removed: [feature]
    });
  }

  ***REMOVED***.selectFeatureInLayer = function(feature, layerId, options) {
    featureSelected({
      name: layerId,
      feature: feature,
      options: options
    });
  }

  return ***REMOVED***;
}]);
