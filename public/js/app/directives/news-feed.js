mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    controller: function ($rootScope, $scope) {
      $scope.currentFeedPanel = 'observationsTab';
      $scope.observations = [];

      $rootScope.$on('observations:update', function(e, updatedObservations) {
        _.each(updatedObservations, function(updatedObservation) {
          var observation = _.find($scope.observations, function(observation) {return observation.id === updatedObservation.id});
          if (observation) observation = updatedObservation;
        });
      });

      $rootScope.$on('observations:new', function(e, observations) {
        $scope.observations = $scope.observations.concat(observations);
      });

      // $rootScope.$on('observations:delete', function(e, observations) {
      //   $scope.observations = observations.slice();  // get a new array of observations
      // });

      $rootScope.$on('observations:refresh', function(e, observations) {
        $scope.observations = observations.slice();  // get a new array of observations
      });

      $scope.observationOrder = function(observation) {
        return moment(observation.properties.timestamp).valueOf() * -1;
      }
    }
  };
});
