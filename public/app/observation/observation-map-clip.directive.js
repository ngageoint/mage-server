var L = require('leaflet');

module.exports = function mapClip() {
  var directive = {
    restrict: 'A',
    scope: {
      feature: '=mapClip',
      featureStyle: '=',
      disableInteraction: '='
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
    console.log('feature', feature)
    if(feature.geometry){
      if(feature.geometry.type === 'Point'){
        observation= L.geoJson(feature, {
          pointToLayer: function (feature, latlng) {
            return L.fixedWidthMarker(latlng, {
              iconUrl: feature.style ? feature.style.iconUrl : ($scope.featureStyle ? $scope.featureStyle.iconUrl : '')
            });
          }
        });
        observation.addTo(map);
        map.setView(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), 15);
      }else{
        observation = L.geoJson(feature, {
          style: function(feature) {
            return feature.style || $scope.featureStyle;
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

    if ($scope.disableInteraction) {
      map.scrollWheelZoom.disable()
      map.dragging.disable()
      map.touchZoom.disable()
      map.doubleClickZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
    }

    map.on('mouseover', function() {
      if (!controlsOn && !$scope.disableInteraction) {
        controlsOn = true;
        map.addControl(zoomControl);
        map.addControl(worldExtentControl);
      }
    });

    map.on('mouseout', function() {
      if (controlsOn && !$scope.disableInteraction) {
        map.removeControl(zoomControl);
        map.removeControl(worldExtentControl);
        controlsOn = false;
      }
    });

    // $scope.$watch('feature.style.iconUrl', function(iconUrl) {
    //   marker.setIcon(L.fixedWidthIcon({
    //     iconUrl: iconUrl
    //   }));
    // });
  }
}
