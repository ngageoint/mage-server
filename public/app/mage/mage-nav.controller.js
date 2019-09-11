var _ = require('underscore');

module.exports = NavController;

NavController.$inject =  ['$rootScope', '$scope', '$location', 'UserService', 'FilterService', 'PollingService', 'Event'];

function NavController($rootScope, $scope, $location, UserService, FilterService, PollingService, Event) {
  var events = [];
  $scope.location = $location;

  $rootScope.$on('event:user', function(e, login) {
    $scope.token = login.token;
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
  });

  $rootScope.$on('logout', function() {
    $scope.myself = null;
    $scope.amAdmin = null;
  });

  $scope.$on('$routeChangeSuccess', function() {
    if ($location.path() === '/map') {
      events = Event.query(function() {
        var recentEventId = UserService.getRecentEventId();
        var recentEvent = _.find(events, function(event) { return event.id === recentEventId; });
        if (recentEvent) {
          FilterService.setFilter({event: recentEvent});
          PollingService.setPollingInterval(PollingService.getPollingInterval());
        } else if (events.length > 0) {
          // TODO 'welcome to MAGE dialog'
          FilterService.setFilter({event: events[0]});
          PollingService.setPollingInterval(PollingService.getPollingInterval());
        } else {
          // TODO welcome to mage, sorry you have no events
        }
      });
    } else {
      FilterService.removeFilters();
      PollingService.setPollingInterval(0);
    }
  });
}
