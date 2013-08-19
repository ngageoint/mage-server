'use strict';

function NavController($scope, $location, UserService) {

  $scope.navCl***REMOVED*** = function (page) {
    var currentRoute = $location.path().substring(1) || 'map';
    return page === currentRoute ? 'active' : '';
  };

  $scope.navigate = function(path) {
    $location.url(path);
  }

  $scope.showMapNav = function() {
    return UserService.amUser();
  }

  $scope.showLayerNav = function() {
    return UserService.amAdmin();
  }

  $scope.showAdminNav = function() {
    return UserService.amAdmin();
  }

  $scope.getUser = function() {
    return UserService.getMyself();
  }

  $scope.logout = function() {
    UserService.logout();
  }
}