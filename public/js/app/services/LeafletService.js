'use strict';

mage.factory('LeafletService', ['$rootScope', 'mageLib', 'Layer', 'EventService', function ($rootScope, mageLib, Layer, EventService) {
  var ***REMOVED*** = {};

  var rasterLayers = {};

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
  var observationsById = _.indexBy(EventService.getObservations(), 'id');
  observationsToVectorLayer(_.values(observationsById));

  ***REMOVED***.getVectorLayers = function() {
    return vectorLayers;
  }

  function onEachObservation(feature, layer) {

  }

  function observationsToVectorLayer(observations) {
    var geoJson = L.geoJson({
      type: 'FeatureCollection',
      features: observations
    },{
      onEachFeature: onEachObservation
    });

    vectorLayers.observations = {name: 'Observations', group: 'MAGE', layer: geoJson, selected: true};
  }

  $rootScope.$on('observations:update', function(e, updatedObservations) {

  });

  $rootScope.$on('observations:new', function(e, observations) {

  });

  $rootScope.$on('observations:archive', function(e, deletedObservations) {

  });

  $rootScope.$on('observations:refresh', function(e, observations) {
    observationsById = _.indexBy(EventService.getObservations(), 'id');

    observationsToVectorLayer(observations);
    $rootScope.$broadcast('layers:vector', vectorLayers);
  });

  return ***REMOVED***;
}]);
