'use strict';

angular.module('mage').controller('NavController', ['$scope', '$location', 'UserService', 'FilterService', 'Event', function ($scope, $location, UserService, FilterService, Event) {
  $scope.location = $location;
  $scope.filter = false;
  $scope.intervals = FilterService.intervals;
  $scope.interval = FilterService.getTimeInterval();


  $scope.$on('login', function(event, login) {
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
    $scope.token = login.token;

    Event.query({userId: $scope.myself.id}, function(events) {
      $scope.events = events;

      var event = FilterService.getEvent();
      if (event) {
        $scope.event = event;
      } else if (events.length > 0) {
        // TODO 'welcome to MAGE dialog'
        $scope.event = events[0];
        FilterService.setEvent($scope.event);
      }
    });
  });

  $scope.$on('logout', function() {
    $scope.token = null;
    $scope.myself = null;
    $scope.amAdmin = null;
  });

  $scope.logout = function() {
    UserService.logout();
  }

  $scope.onEventChange = function(event) {

  }

  $scope.onTimeChange = function(event) {

  }

}]);
