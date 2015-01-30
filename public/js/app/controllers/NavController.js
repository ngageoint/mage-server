'use strict';

function NavController($scope, $location, UserService) {

  $scope.$on('login', function(event, login) {
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
    $scope.token = login.token;
  });

  $scope.$on('logout', function() {
    $scope.token = null;
    $scope.myself = null;
    $scope.amAdmin = null;
  })

  $scope.navigate = function(path) {
    $location.url(path);
  }

  $scope.showAdminNav = function() {
    return UserService.amAdmin;
  }

  $scope.logout = function() {
    UserService.logout();
  }
}
