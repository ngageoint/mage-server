var L = require('leaflet');

module.exports = function mapClip() {
  var directive = {
    restrict: 'A',
    scope: {
      feature: '=mapClip'
    },
    replace: true,
    template: '<div id="map" class="leaflet-map"></div>',
    controller: MapClipController
  };

  return directive;
};

MapClipController.$inject = ['$rootScope', '$scope', '$element', 'MapService'];

function MapClipController($rootScope, $scope, $element, MapService) {
  var zoomControl = L.control.zoom();
  var worldExtentControl = L.control.worldExtent();

  var map = null;
  var controlsOn = false;
  var layers = {};
  var observation = null;

  initialize();

  var mapListener = {
    onBaseLayerSelected: onBaseLayerSelected
  };
  MapService.addListener(mapListener);

  $scope.$on('$destroy', function() {
    MapService.removeListener(mapListener);
  });

  $scope.$watch('feature', function() {

    map.removeLayer(observation);
    addObservation($scope.feature);

  }, true);

  function onBaseLayerSelected(baseLayer) {
    var layer = layers[baseLayer.name];
    if (layer) map.removeLayer(layer.layer);

    layer = createRasterLayer(baseLayer);
    layers[baseLayer.name] = {type: 'tile', layer: baseLayer, rasterLayer: layer};

    layer.addTo(map);
  }

  function createRasterLayer(layer) {
    var baseLayer = null;
    var options = {};
    if (layer.format === 'XYZ' || layer.format === 'TMS') {
      options = { tms: layer.format === 'TMS', maxZoom: 18 };
      baseLayer = new L.TileLayer(layer.url, options);
    } else if (layer.format === 'WMS') {
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

  function addObservation(feature) {

    if(feature.geometry){
      if(feature.geometry.type === 'Point'){
        observation= L.geoJson(feature, {
          pointToLayer: function (feature, latlng) {
            return L.fixedWidthMarker(latlng, {
              iconUrl: feature.style.iconUrl
            });
          }
        });
        observation.addTo(map);
        map.setView(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), 15);
      }else{
        observation = L.geoJson(feature, {
          style: function(feature) {
            return feature.style;
          }
        });
        observation.addTo(map);

        var coordinates = feature.geometry.coordinates;
        if(feature.geometry.type === 'Polygon'){
          coordinates = coordinates[0];
        }
        map.fitBounds(L.latLngBounds(L.GeoJSON.coordsToLatLngs(coordinates)));
      }
    }
  }

  function initialize() {
    map = L.map($element[0], {
      center: [0,0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: false,
      trackResize: true,
      scrollWheelZoom: false,
      attributionControl: false
    });

    if ($scope.feature) {
      addObservation($scope.feature);
    }

    map.on('mouseover', function() {
      if (!controlsOn) {
        controlsOn = true;
        map.addControl(zoomControl);
        map.addControl(worldExtentControl);
      }
    });

    map.on('mouseout', function() {
      if (controlsOn) {
        map.removeControl(zoomControl);
        map.removeControl(worldExtentControl);
        controlsOn = false;
      }
    });
  }
}
