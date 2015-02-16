'use strict';

angular.module('mage').controller('NavController', ['$scope', '$location', 'UserService', 'FilterService', 'Event', function ($scope, $location, UserService, FilterService, Event) {
  $scope.location = $location;
  $scope.filter = false;
  $scope.intervals = FilterService.intervals;
  $scope.interval = FilterService.getTimeInterval();
  $scope.localTime = true;
  $scope.localOffset = moment().format('Z');
  $scope.customStartDate = moment().startOf('day').toDate();
  $scope.customEndDate = moment().endOf('day').toDate();

  $scope.$on('login', function(event, login) {
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
    $scope.token = login.token;

    Event.query({userId: $scope.myself.id}, function(events) {
      $scope.events = events;

      var recentEventId = UserService.getRecentEventId();
      var recentEvent = _.find($scope.events, function(event) { return event.id === recentEventId });
      if (recentEvent) {
        $scope.event = recentEvent;
        FilterService.setEvent($scope.event);
      } else if (events.length > 0) {
        // TODO 'welcome to MAGE dialog'
        $scope.event = events[0];
        FilterService.setEvent($scope.event);
      } else {
        // TODO welcome to mage, sorry you have no events
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
    FilterService.setEvent(event);
  }

  $scope.onIntervalUpdate = function(interval) {
    var options = {};
    if (interval.filter === 'custom') {
      options.startDate = $scope.customStartDate;
      options.endDate = $scope.customEndDate;
      options.localTime = $scope.localTime;
    }

    FilterService.setTimeInterval(interval, options);
  }

  $scope.updateCustomInterval = function(interval) {
    FilterService.setTimeInterval(interval, {
      startDate: $scope.customStartDate,
      endDate: $scope.customEndDate,
      localTime: $scope.localTime
    });
  }

}]);
