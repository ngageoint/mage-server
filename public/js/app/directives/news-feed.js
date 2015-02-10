mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    scope: {
      observations: '=newsFeedObservations'
    },
    controller: function ($rootScope, $scope, FilterService, EventService, Observation, ObservationService) {
      $scope.currentFeedPanel = 'observationsTab';

      $scope.$on('createNewObservation', function() {
        var event = FilterService.getEvent();
        $scope.newObservation = new Observation({
          eventId: event.id,
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0,0]
          },
          properties: {
            timestamp: new Date()
          }
        });

        $scope.newObservationForm = EventService.createForm($scope.newObservation);
      });

      $scope.$on('observationEditDone', function() {
        $scope.newObservation = null;
      });

      $scope.observationOrder = function(observation) {
        return moment(observation.properties.timestamp).valueOf() * -1;
      }
    }
  };
});
