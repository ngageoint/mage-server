mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    scope: {
      observations: '=newsFeedObservations'
    },
    controller: function ($rootScope, $scope, FilterService, EventService, Observation, ObservationService) {
      $scope.currentFeedPanel = 'observationsTab';

      $scope.$on('observation:new', function(e, newObservation) {
        if ($scope.newObservation) return;

        $scope.newObservation = newObservation;
        $scope.newObservationForm = EventService.createForm($scope.newObservation);
      });

      $scope.$on('observation:moved', function(e, observation, latlng) {
        if (!$scope.newObservation || !latlng) return;

        $scope.newObservation.geometry.coordinates = [latlng.lng, latlng.lat];

        var geometryField = EventService.getFormField($scope.newObservationForm, 'geometry');
        geometryField.value = {x: latlng.lng, y: latlng.lat};
      });

      $scope.$on('observation:editDone', function(e, observation) {
        $scope.newObservation = null;
      });

      $scope.observationOrder = function(observation) {
        return moment(observation.properties.timestamp).valueOf() * -1;
      }

      $scope.onObservationClick = function(observation) {
        $scope.$emit('observation:selected', observation);
      }

      $scope.$on('observation:select', function(e, observation) {
        $scope.selectedObservation = observation;
      })
    }
  };
});
