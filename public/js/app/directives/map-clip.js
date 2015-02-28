angular
  .module('mage')
  .directive('mapClip', mapClip);

function mapClip() {
  var directive = {
    restrict: 'A',
    scope: {
      feature: '=mapClip',
    },
    replace: true,
    template: '<div cl***REMOVED***="map"></div>',
    controller: MapClipController,
    bindToController: true
  };

  return directive;
}

MapClipController.$inject = ['$rootScope', '$scope', '$element', 'MapService', 'LocalStorageService'];

function MapClipController($rootScope, $scope, $element, MapService, LocalStorageService) {
  var zoomControl = new L.Control.Zoom();
  var map = null;
  var baseLayer = null;
  var zoomEnabled = false;
  var zoomControlOn = false;
  var layers = {};

  initialize();

  var mapListener = {
    onBaseLayerSelected: onBaseLayerSelected
  };
  MapService.addListener(mapListener);

  $scope.$on('$destroy', function() {
    MapService.removeListener(mapListener);
  });

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

    var latLng = [0,0];
    if ($scope.feature && $scope.feature.geometry) {
      var geojson = L.geoJson($scope.feature, {
        pointToLayer: function (feature, latlng) {
          return L.fixedWidthMarker(latlng, {
            iconUrl: feature.style.iconUrl + '?access_token=' + LocalStorageService.getToken()
          });
        }
      });

      geojson.addTo(map);
      map.setView(L.GeoJSON.coordsToLatLng($scope.feature.geometry.coordinates), 15);
    }

    map.on('mouseover', function() {
      if (!zoomControlOn) {
        zoomControlOn = true;
        map.addControl(zoomControl);
      }
    });

    map.on('mouseout', function() {
      if (zoomControlOn) {
        map.removeControl(zoomControl);
        zoomControlOn = false;
      }
    });
  }
}
