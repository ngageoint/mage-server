'use strict';

function NavController($rootScope, $scope, $log, $http, $injector, $location, appConstants, UserService, mageLib) {
  $scope.user = {};
  $scope.showMapNav = false;
  $scope.showLayerNav = false;
  $scope.showAdminNav = false;

  $scope.navCl***REMOVED*** = function (page) {
    var currentRoute = $location.path().substring(1) || 'map';
    return page === currentRoute ? 'active' : '';
  };

  $scope.user = UserService.getMyself().
    success(function (user) {
      switch (user.role.name) {
        case "ADMIN_ROLE":
          $scope.showLayerNav = true;
          $scope.showAdminNav = true;
        case "USER_ROLE":
          $scope.showMapNav = true;
      }
    }).
    error(function (data, status, headers, config) {

    });
}
