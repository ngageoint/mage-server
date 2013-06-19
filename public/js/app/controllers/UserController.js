'use strict';

angular.module("mage", ["mage.***REMOVED***s", "mage.userService"]);

/*

*/
function UserController($scope, $log, $http, $injector, appConstants, UserService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.team = {};
  $scope.user = {};

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

  $scope.users = [
    {
      'id': '0',
      'username': "solidsnake",
      'firstName': "David",
      'lastName': "Snakeman",
      'email': "snake@foxhound.net",
      'p***REMOVED***word': "ohemgeso***REMOVED***",
      'teams': [0, 1],
      'roles': [0, 1, 2]
    },
    {
      'id': '1',
      'username': "msilverburgh",
      'firstName': "Meryl",
      'lastName': "Silverburgh",
      'email': "meryl@foxhound.net",
      'p***REMOVED***word': "ohemgeso***REMOVED***",
      'teams': [0],
      'roles': [0, 1]
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
      $scope.user.$save();
    }
  }

}
