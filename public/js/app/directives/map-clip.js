mage.directive('mapClip', function() {
  return {
    restrict: 'A',
    scope: {
      mapClip: '=',
      inView: '='
    },
    controller: function($scope, MapService, $element, $window, $rootScope) {
      var zoomControl = new L.Control.Zoom();
      $scope.ms = MapService;
      var layer = {};

      // verify options
      var verifyOptions = function() {
        return $scope.mapClip && ($scope.mapClip.coordinates
          || ($scope.mapClip.geometry && $scope.mapClip.geometry.coordinates));
      }

      $rootScope.$on('leafletLayerChanged', function() {
        if (!MapService.leafletBaseLayerUrl) return;
        if (layer) {
          $scope.map.removeLayer(layer);
        }
        layer = new L.TileLayer(MapService.leafletBaseLayerUrl, MapService.leafletBaseLayerOptions);
        $scope.map.addLayer(layer);
      });

      var createMap = function() {
        if (!$scope.map) {
          $scope.map = new L.Map($element[0], {zoomControl: false, trackResize: true});
          if (MapService.leafletBaseLayerUrl) {
            layer = new L.TileLayer(MapService.leafletBaseLayerUrl, MapService.leafletBaseLayerOptions);
            $scope.map.addLayer(layer);
          }
          $scope.map.scrollWheelZoom.disable();
        }

        var latLng = {
          lat: 0,
          lng: 0
        }
        if (verifyOptions()) {
          var coords = $scope.mapClip.geometry ? $scope.mapClip.geometry.coordinates : $scope.mapClip.coordinates;
          latLng = {
            lat: $scope.mapClip.latLngFormat ? coords[0] : coords[1],
            lng: $scope.mapClip.latLngFormat ? coords[1] : coords[0]
          };
          if (!$scope.marker) {
          $scope.marker = L.marker([latLng.lat, latLng.lng]);
            $scope.marker.addTo($scope.map);
          }
          $scope.marker.setLatLng(new L.LatLng(latLng.lat, latLng.lng));
          $scope.map.setView(new L.LatLng(latLng.lat, latLng.lng),15);
        } else {
          $scope.map.setView(new L.LatLng(0,0), 1);
        }

        $element.on('click', function() {
          if ($scope.zoomEnabled) {
            $scope.map.removeControl(zoomControl);
            $scope.map.scrollWheelZoom.disable();
            $scope.zoomEnabled = false;
          } else {
            $scope.map.addControl(zoomControl);
            $scope.map.scrollWheelZoom.enable();
            $scope.zoomEnabled = true;
          }
        });

      }

      $scope.$watch('mapClip', function() {
        createMap();
      });
    }
  }

});
