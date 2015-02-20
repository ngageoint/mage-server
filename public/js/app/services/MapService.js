angular
  .module('mage')
  .factory('MapService', MapService);

MapService.$inject = ['$q', 'Observation', 'ObservationAttachment', 'ObservationState'];

function MapService($rootScope, mageLib, Layer, EventService) {

  var ***REMOVED*** = {
    addListener: addListener,
    removeListener: removeListener,
    getRasterLayers: getRasterLayers,
    selectBaseLayer: selectBaseLayer,
    addOverlay: addOverlay,
    removeOverlay: removeOverlay,
    getVectorLayers: getVectorLayers,
    createRasterLayer: createRasterLayer,
    createVectorLayer: createVectorLayer,
    createMarker: createMarker,
    removeMarker: removeMarker,
    updateMarker: updateMarker,
    addFeatureToLayer: addFeatureToLayer,
    updateFeatureForLayer: updateFeatureForLayer,
    removeFeatureFromLayer: removeFeatureFromLayer,
    selectFeatureInLayer: selectFeatureInLayer
  };

  var baseLayer = null;
  var rasterLayers = [];
  var vectorLayers = [];
  var listeners = [];

  return ***REMOVED***;

  function addListener(listener) {
    listeners.push(listener);

    if (_.isFunction(listener.onLayersChanged)) {
      listener.onLayersChanged({added: rasterLayers.concat(vectorLayers)});
    }

    if (_.isFunction(listener.onBaseLayerSelected) && baseLayer) {
      listener.onBaseLayerSelected(baseLayer);
    }
  }

  function removeListener(listener) {
    listeners = _.reject(listeners, function(l) { return l === listener; });
  }

  function getRasterLayers() {
    return rasterLayers;
  }

  function getVectorLayers() {
    return vectorLayers;
  }

  function createRasterLayer(layer) {
    layersChanged({
      added: [layer]
    });

    rasterLayers.push(layer);
  }

  function createVectorLayer(layer) {
    layersChanged({
      added: [layer]
    });

    vectorLayers.push(layer);
  }

  function createMarker(marker, options) {
    if (options) marker.options = options;

    layersChanged({
      name: marker.id,
      added: [marker]
    });
  }

  function removeMarker(marker, markerId) {
    layersChanged({
      name: markerId,
      removed: [marker]
    });
  }

  function updateMarker(marker, markerId) {
    layersChanged({
      name: markerId,
      updated: [marker]
    });
  }

  function addFeatureToLayer(feature, layerId) {
    featuresChanged({
      name: layerId,
      added: [feature]
    });
  }

  function updateFeatureForLayer(feature, layerId) {
    featuresChanged({
      name: layerId,
      updated: [feature]
    });
  }

  function removeFeatureFromLayer(feature, layerId) {
    featuresChanged({
      name: layerId,
      removed: [feature]
    });
  }

  function selectFeatureInLayer(feature, layerId, options) {
    featureSelected({
      name: layerId,
      feature: feature,
      options: options
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

  function layersChanged(changed) {
    _.each(listeners, function(listener) {
      changed.added = changed.added || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onLayersChanged)) {
        listener.onLayersChanged(changed);
      }
    });
  }

  function selectBaseLayer(layer) {
    baseLayer = layer;
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onBaseLayerSelected)) {
        listener.onBaseLayerSelected(layer);
      }
    });
  }

  function addOverlay(overlay) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onOverlayRemoved)) {
        listener.onOverlayAdded(overlay);
      }
    });
  }

  function removeOverlay(overlay) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onOverlayRemoved)) {
        listener.onOverlayRemoved(overlay);
      }
    });
  }
}
