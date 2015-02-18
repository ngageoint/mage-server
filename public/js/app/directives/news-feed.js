mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    scope: {
      observations: '=newsFeedObservations'
    },
    controller: function ($rootScope, $scope, $element, $filter, $timeout, FilterService, EventService, Observation, ObservationService) {
      $scope.currentFeedPanel = 'observationsTab';
      $scope.currentObservationPage = 0;
      var observationsPerPage = 5;

      $scope.observationPages = null;
      calculateObservationPages($scope.observations);

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

      $scope.onObservationClick = function(observation) {
        $scope.$emit('observation:selected', observation, {zoomToLocation: true});
      }

      $scope.$on('observation:select', function(e, observation) {
        $scope.selectedObservation = observation;

        // locate the page this observation is on
        var page;
        for (page = 0; page < $scope.observationPages.length; page++) {
          var last = _.last($scope.observationPages[page]);
          if (last.properties.timestamp <= observation.properties.timestamp) {
            break;
          }
        }

        // goto that page (if not already there)
        $scope.currentObservationPage = page;

        // scroll to observation in that page
        $timeout(function() {
          var feedElement = $($element.find(".news-items"));
          feedElement.animate({scrollTop: $('#' + observation.id).position().top});
        });
      });

      $scope.$on('observation:deselect', function(e, observation) {
        if ($scope.selectedObservation && $scope.selectedObservation.id == observation.id) {
          $scope.selectedObservation = null;
        }
      });

      $scope.$watch('observations', function(observations) {
        calculateObservationPages(observations);
      });

      function calculateObservationPages(observations) {
        if (!observations) return;

        // sort the observations
        observations = $filter('orderBy')(observations, function(observation) {
          return moment(observation.properties.timestamp).valueOf() * -1;
        });

        // slice into pages
        var pages = [];
        for (var i = 0, j = observations.length; i < j; i += observationsPerPage) {
          pages.push(observations.slice(i, i + observationsPerPage));
        }

        $scope.observationPages = pages;
      }
    }
  };
});
