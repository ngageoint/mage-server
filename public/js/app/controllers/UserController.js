'use strict';

angular.module("mage", ["mage.***REMOVED***s", "mage.userService"]);

/*

*/
function UserController($scope, $log, $http, $injector, appConstants, UserService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.team = {};
  $scope.user = {};

  $scope.users = [];

  $scope.teams = [
    {
      'id': "0",
      'teamName': "Fox Hound",
      'description': "Desert search and rescue group."
    },
    {
      'id': "1",
      'teamName': "Diamond Dogs",
      'description': "Urban search and rescue group."
    }
  ];

  $scope.getTeams = function() {

  }

  $scope.newTeam = function() {
    $('#new-team-form').removeCl***REMOVED***('hide');
  }

  $scope.viewTeam = function(team) {
    $scope.team = team;
    $('#new-team-form').removeCl***REMOVED***('hide'); 
  }

  $scope.saveTeam = function() {
    console.log("saving team...");
  }


  $scope.getUsers = function() {
    $scope.users = [];
    //var user = new UserService.user();
    //var result = user.$query();
    //$scope.users = result;
    $http({
        url:appConstants.rootUrl + '/api/users', 
        method: 'GET',
        isArray: true,
        data: 'username=' + $scope.user.username + 
              '&p***REMOVED***word=' + $scope.user.p***REMOVED***word + 
              '&p***REMOVED***wordconfirm=' + $scope.user.p***REMOVED***wordconfirm + 
              '&firstnane=' + $scope.user.firstname + 
              '&lastname=' + $scope.user.lastname +
              '&email=' + $scope.user.email,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).
        success(function (data, status, headers, config) {
          console.log("sucessful user get!");
          $scope.users = data;
        }).
        error(function (data, status, headers, config) {
          console.log("Something bad happend while trying to create a user " + status);
        });
  }

  $scope.newUser = function() {
    $scope.user = new UserService.user();
    $('#new-user-form').removeCl***REMOVED***('hide');
  }

  $scope.viewUser = function(user) {
    $scope.user = new UserService.user(user);
    $('#new-user-form').removeCl***REMOVED***('hide');
  }

  $scope.saveUser = function() {
    console.log("saving user...");
    if ($scope.user.id) { // update
      $scope.user.$update();
    } else { // new user
      /*$scope.user.$newUser('username=' + $scope.user.username + 
        '&p***REMOVED***word=' + $scope.user.p***REMOVED***word + 
        '&p***REMOVED***wordconfirm=' + $scope.user.p***REMOVED***wordconfirm + 
        '&firstnane=' + $scope.user.firstnane + 
        '&lastname=' + $scope.user.lastname +
        '&email=' + $scope.user.email);*/
      $http({
        url:appConstants.rootUrl + '/api/users', 
        method: "POST",
        data: 'username=' + $scope.user.username + 
              '&p***REMOVED***word=' + $scope.user.p***REMOVED***word + 
              '&p***REMOVED***wordconfirm=' + $scope.user.p***REMOVED***wordconfirm + 
              '&firstnane=' + $scope.user.firstname + 
              '&lastname=' + $scope.user.lastname +
              '&email=' + $scope.user.email,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).
        success(function (data, status, headers, config) {
          console.log("sucessful user save!");
          window.location = '/#/map'
        }).
        error(function (data, status, headers, config) {
          console.log("Something bad happend while trying to create a user " + status);
        });
    }
  }

  $scope.getUsers();
}
