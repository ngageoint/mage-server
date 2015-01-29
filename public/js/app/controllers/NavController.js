'use strict';

function NavController($scope, $location, UserService, EventService, Event) {

  $scope.user = UserService;

  $scope.$watch('user.myself', function(myself) {
    if (!myself) return;

    Event.query({userId: myself.id},function(events) {
      if (events && events.length) {
        EventService.currentEvent = events[0];
        $scope.event = EventService.currentEvent;
      }
    });
  });

  $scope.navCl***REMOVED*** = function (page) {
    var match = $location.path().match(new RegExp('^\/' + page + '.*'));
    return match != null ? 'active' : '';
  };

  $scope.navigate = function(path) {
    $location.url(path);
  }

  $scope.showMapNav = function() {
    return $scope.user.amUser;
  }

  $scope.showLayerNav = function() {
    return $scope.user.amAdmin;
  }

  $scope.showAdminNav = function() {
    return $scope.user.amAdmin;
  }

  $scope.getUser = function() {
    return $scope.user.myself;
  }

  $scope.logout = function() {
    UserService.logout();
  }
}
