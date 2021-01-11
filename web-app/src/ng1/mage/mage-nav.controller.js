var _ = require('underscore');

module.exports = NavController;

NavController.$inject =  ['$rootScope', '$scope'];

function NavController($rootScope, $scope) {
  $rootScope.$on('event:user', function(e, login) {
    $scope.token = login.token;
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
  });

  $rootScope.$on('logout', function() {
    $scope.myself = null;
    $scope.amAdmin = null;
  });

  // $transitions.onSuccess({to: 'map'}, () => { 
  //   events = Event.query(() => {
  //     var recentEventId = UserService.getRecentEventId();
  //     var recentEvent = _.find(events, event => { return event.id === recentEventId; });
  //     if (recentEvent) {
  //       FilterService.setFilter({event: recentEvent});
  //       PollingService.setPollingInterval(PollingService.getPollingInterval());
  //     } else if (events.length > 0) {
  //       // TODO 'welcome to MAGE dialog'
  //       FilterService.setFilter({event: events[0]});
  //       PollingService.setPollingInterval(PollingService.getPollingInterval());
  //     } else {
  //       // TODO welcome to mage, sorry you have no events
  //     }
  //   });
  // });

  // $transitions.onBefore({from: 'map'}, () => {
  //   FilterService.removeFilters();
  //   PollingService.setPollingInterval(0);
  // });

  this.feedToggle = function() {
    this.toggleFeed = {
      foo: 'bar'
    };
  }
}
