'use strict';

function NavController($rootScope, $scope, $log, $http, $injector, $location, appConstants, UserService, mageLib) {
  $scope.user = {};
  $scope.showMapLink = false;
  $scope.showLayerLink = false;
  $scope.showAdminLink = false;

  $scope.user = UserService.getMyself().
    success(function (data) {
      $scope.user = data;
    }).
    error(function (data, status, headers, config) {

    });
}
