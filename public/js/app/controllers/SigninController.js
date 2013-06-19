'use strict';

angular.module("sage", ["mage.***REMOVED***s", "mage.userService"]);

/*

*/
function SigninController($scope, $log, $http, $injector, appConstants, UserService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.signin = function() {
    console.log("signing in...just add code");
    // need to hand off username and p***REMOVED***word to the server.
    // do some stuff here to handle the response that we get from the server
  }

}
