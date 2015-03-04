angular
  .module('mage')
  .controller('NavController', NavController);

NavController.$inject =  ['$scope', '$location', 'UserService', 'FilterService', 'PollingService', 'Event'];

function NavController($scope, $location, UserService, FilterService, PollingService, Event) {
  $scope.location = $location;

  $scope.filter = false;
  $scope.intervals = FilterService.intervals;
  $scope.interval = FilterService.getTimeInterval();
  $scope.localTime = true;
  $scope.localOffset = moment().format('Z');
  $scope.customStartDate = moment().startOf('day').toDate();
  $scope.customEndDate = moment().endOf('day').toDate();

  $scope.pollingInterval = 30000;

  $scope.$on('login', function(event, login) {
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
    $scope.token = login.token;

    if ($location.path() !== '/map') return;

    Event.query(function(events) {
      $scope.events = events;

      var recentEventId = UserService.getRecentEventId();
      var recentEvent = _.find($scope.events, function(event) { return event.id === recentEventId });
      if (recentEvent) {
        $scope.event = recentEvent;
        FilterService.setEvent($scope.event);
        PollingService.setPollingInterval($scope.pollingInterval);
      } else if (events.length > 0) {
        // TODO 'welcome to MAGE dialog'
        $scope.event = events[0];
        FilterService.setEvent($scope.event);
        PollingService.setPollingInterval($scope.pollingInterval);
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

  $scope.onCustomIntervalChanged = function(interval) {
    FilterService.setTimeInterval(interval, {
      startDate: $scope.customStartDate,
      endDate: $scope.customEndDate,
      localTime: $scope.localTime
    });
  }

  $scope.onPollingIntervalChanged = function(pollingInterval) {
    $scope.pollingInterval = pollingInterval;
    PollingService.setPollingInterval(pollingInterval);
  }

}
