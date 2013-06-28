'use strict';

angular.module("mage", ["mage.***REMOVED***s", "mage.userService", "mage.lib"]);

/*

*/
function SigninController($rootScope, $scope, $log, $http, $injector, appConstants, UserService, mageLib) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  console.log('up in the signin controller');
  $scope.signin = function () {
    console.log("signing in...just add code");
    $http({
        url:appConstants.rootUrl + '/api/login', 
        method: "POST",
        data: 'username=' + $scope.username + '&p***REMOVED***word=' + $scope.p***REMOVED***word + '&uid=' + $scope.uid,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).
        success(function (data, status, headers, config) {
          console.log("sucessful login!");
          mageLib.setLocalItem('token', data.token);
          window.location = '/#/map'
        }).
        error(function (data, status, headers, config) {
          console.log("Something bad happend while trying to log in " + status);
        });
    // need to hand off username and p***REMOVED***word to the server.
    // do some stuff here to handle the response that we get from the server
  }
}
