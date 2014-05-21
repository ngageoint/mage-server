mage.directive('observationNewsItem', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
    	observation: '=observationNewsItem',
      containerElement: '@'
    },
    controller: function ($scope, IconService, ObservationService, $sce, mageLib, MapService, $element, appConstants) {
      $scope.ms = MapService;
    	$scope.iconTag = $sce.trustAsHtml(IconService.iconHtml($scope.observation, $scope));
      $scope.attachmentUrl = '/FeatureServer/' + $scope.observation.layerId + '/features/';
      $scope.token = mageLib.getLocalItem('token');
      $scope.readOnlyMode = appConstants.readOnly;
      $scope.mapClipConfig = {
        coordinates: $scope.observation.geometry.coordinates,
        geoJsonFormat: true
      };

      $scope.setActiveObservation = function(observation) {
        $scope.$emit('observationClick', observation);
      }

      $scope.startEdit = function() {
        ObservationService.createNewForm($scope.observation)
          .then(function(form) {
            $scope.editForm = form;
          });
      }

      $scope.$watch('editForm', function() {
        ObservationService.createNewForm($scope.observation)
          .then(function(form) {
            $scope.viewForm = form;
          });
      });
    }
  };
});
