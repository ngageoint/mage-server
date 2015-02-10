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

  function createBaseLayer(layer) {
    var baseLayer = null;
    var options = {};
    if (layer.format == 'XYZ' || layer.format == 'TMS') {
      options = { tms: layer.format == 'TMS', maxZoom: 18}
      baseLayer = new L.TileLayer(layer.url, options);
    } else if (layer.format == 'WMS') {
      options = {
        layers: layer.wms.layers,
        version: layer.wms.version,
        format: layer.wms.format,
        transparent: layer.wms.transparent
      };

      if (layer.wms.styles) options.styles = layer.wms.styles;
      baseLayer = new L.TileLayer.WMS(layer.url, options);
    }

    return baseLayer;
  }

  var rasterLayers = {};
  ***REMOVED***.getRasterLayers = function() {
    return rasterLayers;
  }

  Layer.query(function (layers) {
    var rasterLayers = {};
    _.each(layers, function(layer) {
      // Add token to the url of all private layers
      // TODO add watch for token change and reset the url for these layers
      if (layer.type === 'Imagery' && layer.url.indexOf('private') == 0) {
        layer.url = layer.url + "?access_token=" + mageLib.getToken();
      }

      if (layer.type === 'Imagery' && layer.base) {
        rasterLayers.baseLayers = rasterLayers.baseLayers || {};
        rasterLayers.baseLayers[layer.name] = createBaseLayer(layer);
      }
    });

    $rootScope.$broadcast('layers:raster', rasterLayers);
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

  ***REMOVED***.createGeoJsonLayer = function(layer) {
    layer.type = 'geojson';
    layers[layer.name] = layer;
    layersChanged({
      added: [layer],
      options: layer.options
    });
  }

  ***REMOVED***.addFeature = function(layerName, feature) {
    featuresChanged({
      name: layerName,
      added: [feature]
    });
  }

  ***REMOVED***.removeFeature = function(layerName, feature) {
    featuresChanged({
      name: layerName,
      removed: [feature]
    });
  }

  ***REMOVED***.selectObservation = function(feature) {
    featuresChanged({
      name: 'Observations',
      selected: [feature]
    });
  }

  ***REMOVED***.removeLayerFromGeoJson = function(geojson, layer) {
    $rootScope.$broadcast('geojson:remove', geojson, layer);
  }



  return ***REMOVED***;
}]);
