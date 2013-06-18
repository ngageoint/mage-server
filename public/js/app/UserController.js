'use strict';

angular.module("sage", ["sage.***REMOVED***s"]);

/*

*/
function UserController($scope, $log, $http, $injector, appConstants) {

  $scope.users = [
    {
      'username': "tednopeni",
      'firstName': "Ted",
      'lastName': "Nopeniswitz",
      'email': "tednopeni@dreamcast.net",
      'p***REMOVED***word': "ohemgeso***REMOVED***",
      'teams': [0, 1],
      'roles': [0, 1, 2]
    }
  ];

  $scope.getUsers = function() {

  }

  $scope.newUser = function() {
    $('#new-user-form').removeCl***REMOVED***('hide');
  }

  $scope.saveUser = function() {
    console.log("saving user...");
  }

}
