mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    scope: {
      observations: '=feedObservations',
      feedObservationsChanged: '=',
      users: '=feedUsers',
      feedUsersChanged: '='
    },
    controller: function ($rootScope, $scope, $element, $filter, $timeout, FilterService, EventService, Observation, ObservationService) {
      $scope.currentFeedPanel = 'observationsTab';

      $scope.currentObservationPage = 0;
      $scope.observationsChanged = 0;
      $scope.observationPages = null;
      var observationsPerPage = 25;

      $scope.currentUserPage = 0;
      $scope.usersChanged = 0;
      $scope.userPages = null;
      $scope.followUserId = null;
      var usersPerPage = 25;

      calculateObservationPages($scope.observations);
      calculateUserPages($scope.users);

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

      $scope.tabSelected = function(tab) {
        $scope.currentFeedPanel = tab;

        if ($scope.currentFeedPanel === 'observationsTab') {
          $scope.observationsChangedSeen = $scope.observationsChanged;
        } else if ($scope.currentFeedPanel === 'peopleTab') {
          $scope.feedUsersChanged = {};
          $scope.usersChanged = 0;
        }
      }

      $scope.$watch('feedObservationsChanged', function(feedObservationsChanged) {
        if (!feedObservationsChanged) return;

        if ($scope.currentFeedPanel === 'peopleTab') {
          $scope.observationsChanged = feedObservationsChanged.count;
        }
      }, true);

      $scope.$watch('feedUsersChanged', function(feedUsersChanged) {
        if (!feedUsersChanged) return;

        if ($scope.currentFeedPanel === 'observationsTab') {
          $scope.usersChanged = _.keys(feedUsersChanged).length;
        }
      }, true);

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

        $scope.currentObservationPage = page;
        $scope.currentFeedPanel = 'observationsTab';

        $timeout(function() {
          // scroll to observation in that page
          var feedElement = $($element.find(".news-items"));
          feedElement.animate({scrollTop: $('#' + observation.id).position().top});
        });
      });

      $scope.$on('observation:deselect', function(e, observation) {
        if ($scope.selectedObservation && $scope.selectedObservation.id == observation.id) {
          $scope.selectedObservation = null;
        }
      });

      $scope.$on('user:select', function(e, user) {
        $scope.selectedUser = user;

        // locate the page this user is on
        var page;
        for (page = 0; page < $scope.userPages.length; page++) {
          var last = _.last($scope.userPages[page]);
          if (last.location.properties.timestamp <= user.location.properties.timestamp) {
            break;
          }
        }

        $scope.currentUserPage = page;
        $scope.currentFeedPanel = 'peopleTab';

        $timeout(function() {
          // scroll to observation in that page
          var feedElement = $($element.find(".news-items"));
          feedElement.animate({scrollTop: $('#' + user.id).position().top});
        });
      });

      $scope.$on('user:deselect', function(e, user) {
        if ($scope.selectedUser && $scope.selectedUser.id == user.id) {
          $scope.selectedUser = null;
        }
      });

      $scope.$on('user:follow', function(e, user) {
        $scope.followUserId = $scope.followUserId == user.id ? null : user.id;
      });

      $scope.$watch('observations', function(observations) {
        calculateObservationPages(observations);
      });

      $scope.$watch('users', function(users) {
        calculateUserPages(users);
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

      function calculateUserPages(users) {
        if (!users) return;

        // sort the locations
        users = $filter('orderBy')(users, function(user) {
          return moment(user.location.properties.timestamp).valueOf() * -1;
        });

        // slice into pages
        var pages = [];
        for (var i = 0, j = users.length; i < j; i += usersPerPage) {
          pages.push(users.slice(i, i + usersPerPage));
        }

        $scope.userPages = pages;
      }
    }
  };
});
