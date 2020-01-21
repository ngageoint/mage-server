var L = require('leaflet');

module.exports = function mapClip() {
  var directive = {
    restrict: 'A',
    scope: {
      feature: '=mapClip',
      disableInteraction: '='
    },
    replace: true,
    template: '<div class="leaflet-map"></div>',
    controller: MapClipController
  };

  return directive;
};

MapClipController.$inject = ['$scope', '$element', 'MapService', 'LocalStorageService'];

function MapClipController($scope, $element, MapService, LocalStorageService) {
  var zoomControl = L.control.zoom();
  var worldExtentControl = L.control.worldExtent();

  var map = null;
  var controlsOn = false;
  var layers = {};
  var observation = null;
  var marker = null;

  initialize();

  var mapListener = {
    onBaseLayerSelected: onBaseLayerSelected
  };
  MapService.addListener(mapListener);

  $scope.$on('$destroy', function() {
    MapService.removeListener(mapListener);
  });

  $scope.$watch('feature', function() {
    if (observation) {
      map.removeLayer(observation);
    }
    if (marker) {
      map.removeLayer(marker);
    }
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

  $scope.$watch('feature.style.iconUrl', function() {
    if (!$scope.feature.geometry || !$scope.feature.style || !$scope.feature.style.iconUrl) return;
    marker.setIcon(L.fixedWidthIcon({
      iconUrl: $scope.feature.style.iconUrl
    }));
  });

  function addObservation(feature) {
    if (!feature || !feature.geometry || !feature.geometry.coordinates.length) {
      const mapPosition = LocalStorageService.getMapPosition();
      map.setView(mapPosition.center, 1);
      return;
    }

    if (feature.geometry) {
      if(feature.geometry.type === 'Point'){
        observation = L.geoJson(feature, {
          pointToLayer: function (feature, latlng) {
            marker = L.fixedWidthMarker(latlng, {
              iconUrl: feature.style ? feature.style.iconUrl : ($scope.feature.style ? $scope.feature.style.iconUrl : '')
            });
            return marker;
          }
        });
        observation.addTo(map);
        map.setView(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), 15);
      } else {
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
    const mapPosition = LocalStorageService.getMapPosition();

    map = L.map($element[0], {
      center: mapPosition.center,
      zoom: 1,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: false,
      trackResize: true,
      scrollWheelZoom: false,
      attributionControl: false
    });

    if ($scope.disableInteraction) {
      map.scrollWheelZoom.disable();
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
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


  }
}
