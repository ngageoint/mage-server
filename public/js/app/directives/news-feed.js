mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    scope: {},
    controller: function ($rootScope, $scope, FilterService, EventService, Observation, ObservationService) {
      $scope.currentFeedPanel = 'observationsTab';
      $scope.observations = [];

      $rootScope.$on('observations:update', function(e, updatedObservations) {
        _.each(updatedObservations, function(updatedObservation) {
          var observation = _.find($scope.observations, function(observation) {return observation.id === updatedObservation.id});
          if (observation) angular.copy(updatedObservation, observation);
        });
      });

      $rootScope.$on('observations:new', function(e, observations) {
        $scope.observations = $scope.observations.concat(observations);
      });

      $rootScope.$on('observations:archive', function(e, deletedObservations) {
        $scope.observations = _.reject($scope.observations, function(observation) {
          return _.some(deletedObservations, function(deletedObservation) { return observation.id == deletedObservation.id});
        });
      });

      $rootScope.$on('observations:refresh', function(e, observations) {
        $scope.observations = observations.slice();  // get a new array of observations
      });

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
