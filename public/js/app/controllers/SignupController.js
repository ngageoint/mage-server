'use strict';

function SignupController($rootScope, $scope, $log, $http, $injector, $location, appConstants, UserService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  console.log('up in the signin controller');

  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  $scope.signup = function () {
    UserService.signup($scope.user).
      success(function (data, status, headers, config) {
        $scope.user = {};
        $scope.showStatusMessage("Success", "Account created, contact an administrator to activate your account.", "alert-success")
      }).
      error(function (data, status, headers, config) {
        $scope.showStatusMessage("There was a problem creating your account", data, "alert-error")
      });
  }

  $scope.showStatusMessage = function (title, message, statusLevel) {
    $scope.statusTitle = title;
    $scope.statusMessage = message;
    $scope.statusLevel = statusLevel;
    $scope.showStatus = true;
  }
}
