'use strict';

/*

*/
function AdminController($scope, $log, $http, $injector, appConstants, UserService, DeviceService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.currentAdminPanel = "user"; // possible values user, team, and device
  
  $scope.users = [];
  UserService.getAllUsers().success(function (data) {
    $scope.users = data;
  });

  $scope.devices = [];
  DeviceService.getAllDevices().success(function (data) {
    $scope.devices = data;
  })
  
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

  $scope.showUserForm = false;

  $scope.setShowUserForm = function (visibility) {
    $scope.showUserForm = visibility;
  }

  /* Set the current activity, this will tell the directives which one of them should be visible at the moment. */
  $scope.changeCurrentPanel = function (panel) {
    console.log("change current panel " + panel);
    $scope.currentAdminPanel = panel;
  }

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


  /*$scope.getUsers = function() {
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
          console.log("Something bad happend while trying to get the users " + status);
        });
  }*/

  $scope.saveUser = function () {
    if ($scope.user.id) {
      UserService.updateUser($scope.user);
    } else {
      UserService.createUser($scope.user);
    }
  }

  $scope.newUser = function() {
    $scope.user = new UserService.user();
    $('#new-user-form').removeCl***REMOVED***('hide');
  }

  $scope.viewUser = function(user) {
    $scope.user = new UserService.user(user);
    $('#new-user-form').removeCl***REMOVED***('hide');
  }

  $scope.deleteUser = function () {

  }

  /* Device API calls */
  $scope.getDevices = function () {

  }

  $scope.newDevice = function () {

  }

  $scope.saveDevice = function () {

  }

  $scope.deleteDevice = function () {

  }
}
