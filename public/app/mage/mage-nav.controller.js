angular
  .module('mage')
  .controller('NavController', NavController);

NavController.$inject =  ['$scope', '$q', '$location', '$modal', 'UserService', 'FilterService', 'PollingService', 'Event'];

function NavController($scope, $q, $location, $modal, UserService, FilterService, PollingService, Event) {
  var events = [];
  $scope.location = $location;

  $scope.pollingInterval = 30000;

  $scope.$on('logout', function() {
    $scope.myself = null;
    $scope.amAdmin = null;
  });

  $scope.$on('$routeChangeSuccess', function() {
    $scope.myself = UserService.myself;
    $scope.amAdmin = UserService.amAdmin;

    if ($location.path() === '/map') {
      events = Event.query(function(response) {
        var recentEventId = UserService.getRecentEventId();
        var recentEvent = _.find(events, function(event) { return event.id === recentEventId });
        if (recentEvent) {
          FilterService.setEvent(recentEvent);
          PollingService.setPollingInterval($scope.pollingInterval);
        } else if (events.length > 0) {
          // TODO 'welcome to MAGE dialog'
          FilterService.setEvent(events[0]);
          PollingService.setPollingInterval($scope.pollingInterval);
        } else {
          // TODO welcome to mage, sorry you have no events
        }
      });
    } else {
      FilterService.setEvent(null);
      PollingService.setPollingInterval(0);
    }
  });

  $scope.logout = function() {
    UserService.logout();
  }

  $scope.onPollingIntervalChanged = function(pollingInterval) {
    $scope.pollingInterval = pollingInterval;
    PollingService.setPollingInterval(pollingInterval);
  }

  $scope.onFilterClick = function() {
    var modalInstance = $modal.open({
      templateUrl: '/app/filter/filter.html',
      controller: 'FilterController',
      resolve: {
        events: function () {
          return events;
        }
      }
    });
  }

  $scope.onExportClick = function() {
    var modalInstance = $modal.open({
      templateUrl: '/app/export/export.html',
      controller: 'ExportController'
    });
  }
}
