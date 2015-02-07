mage.directive('observationNewsItem', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
    	observation: '=observationNewsItem'
    },
    controller: function ($scope, EventService, ObservationService, mageLib, MapService) {
      $scope.ms = MapService;
      $scope.edit = false;
      $scope.attachmentUrl = '/FeatureServer/' + $scope.observation.layerId + '/features/';
      $scope.token = mageLib.getLocalItem('token');
      $scope.mapClipConfig = {
        coordinates: $scope.observation.geometry.coordinates,
        geoJsonFormat: true
      };

      $scope.setActiveObservation = function(observation) {
        $scope.$emit('observationClick', observation);
      }

      $scope.filterArchived = function(field) {
        return !field.archived;
      }

      $scope.editObservation = function() {
        $scope.edit = true;
        $scope.editForm = angular.copy($scope.form);
      }

      $scope.$on('observationEditDone', function() {
        $scope.edit = false;
        $scope.editForm = null;
      });

      $scope.$watch('observation', function(observation) {
        $scope.form = EventService.createForm(observation);
      }, true);
    }
  };
});
