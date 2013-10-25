mage.directive('observationNewsItem', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
    	observation: '=observationNewsItem'
    },
    controller: function ($scope, IconService, $sce, mageLib) {
    	$scope.iconTag = $sce.trustAsHtml(IconService.iconHtml($scope.observation, $scope));
      $scope.attachmentUrl = '/FeatureServer/2/features/';
      $scope.token = mageLib.getLocalItem('token');
      $scope.mapClipConfig = {
        coordinates: $scope.observation.geometry.coordinates,
        geoJsonFormat: true
      };
      $scope.setActiveObservation = function(observation) {
        $scope.$emit('observationClick', observation);
      }
    }
  };
});

mage.directive('mapClip', function() {
  return {
    restrict: 'A',
    scope: {
      mapClip: '='
    },
    controller: function($scope, MapService, $element) {
      var zoomControl = new L.Control.Zoom();

      $element.on('click', function() {
        if ($scope.zoomEnabled) {
          map.removeControl(zoomControl);
          map.scrollWheelZoom.disable();
          $scope.zoomEnabled = false;
        } else {
          map.addControl(zoomControl);
          map.scrollWheelZoom.enable();
          $scope.zoomEnabled = true;
        }
      });

      // verify options
      var verifyOptions = function() {
        return $scope.mapClip.coordinates;
      }

      if (verifyOptions()) {
        var latLng = {
          lat: $scope.mapClip.geoJsonFormat ? $scope.mapClip.coordinates[1] : $scope.mapClip.coordinates[0],
          lng: $scope.mapClip.geoJsonFormat ? $scope.mapClip.coordinates[0] : $scope.mapClip.coordinates[1]
        };

        var map = new L.Map($element[0], {zoomControl: false});

        var layer = new L.TileLayer(MapService.leafletBaseLayerUrl, MapService.leafletBaseLayerOptions);   

        map.setView(new L.LatLng(latLng.lat, latLng.lng),15);
        map.addLayer(layer);
        var marker = L.marker([latLng.lat, latLng.lng]).addTo(map);
        map.scrollWheelZoom.disable();
      }
    }
  }
  
});