'use strict';

function SigninController($rootScope, $scope, $log, $http, $injector, $location, appConstants, UserService, mageLib) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  console.log('up in the signin controller');

  $scope.status = 0;

  $scope.signin = function () {
    console.log("signing in...");
    $http({
        url:appConstants.rootUrl + '/api/login', 
        method: "POST",
        data: 'username=' + $scope.username + '&p***REMOVED***word=' + $scope.p***REMOVED***word + '&uid=' + $scope.uid,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).
        success(function (data, status, headers, config) {
          console.log("sucessful login!");
          mageLib.setLocalItem('token', data.token);
          $location.path('/map');
        }).
        error(function (data, status, headers, config) {
          console.log("Something bad happend while trying to log in " + status);
          $scope.status = status;
        });
  }
}
