'use strict';
angular.module('mage').controller('AdminTeamsCtrl', function ($scope, $filter, $injector, $location, $anchorScroll, mageLib, Team, UserService) {
  $scope.token = mageLib.getLocalItem('token');
  $scope.teams = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  UserService.getAllUsers(true).success(function(users) {
    $scope.users = users;
    $scope.usersIdMap = _.indexBy(users, 'id');
    Team.query(function(teams) {
      $scope.teams = teams;
    });
  });

  $scope.newTeam = function() {
    $scope.team = new Team();
    $scope.team.users = [];
    $scope.nonUsers = $scope.users.slice();
  }

  $scope.editTeam = function(team) {
    $scope.edit = false;
    $scope.add = false;

    $scope.team = team;
    $scope.teamUsersById = _.indexBy($scope.team.users, 'id');
    $scope.nonUsers = _.filter($scope.users, function(user) {
      return $scope.teamUsersById[user.id] == null;
    });
  }

  $scope.addUser = function(user) {
    $scope.team.users.push(user);
    $scope.nonUsers = _.reject($scope.nonUsers, function(u) { return user.id == u.id});
  }

  $scope.removeUser = function(user) {
    $scope.nonUsers.push(user);
    $scope.team.users = _.reject($scope.team.users, function(u) { return user.id == u.id});
  }

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 5000);

  var saveTeam = function(team, success, failure) {
    $scope.saving = true;
    $scope.error = false;

    $scope.team.$save(function() {
      $scope.saved = true;
      $scope.saving = false;

      debounceHideSave();
      if (success) success();
    }, function(reponse) {
      $scope.error = response.data;
      $scope.saving = false;
      if (failure) failure();
    });
  }

  $scope.updateTeam = function(team) {
    saveTeam(team);
  }

  $scope.createTeam = function(team) {
    saveTeam(team, function() {
      $scope.teams.push($scope.team);
    });
  }

  $scope.deleteTeam = function(team) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/js/app/partials/admin/delete-team.html',
      resolve: {
        team: function () {
          return $scope.team;
        }
      },
      controller: function ($scope, $modalInstance, team) {
        $scope.team = team;

        $scope.deleteTeam = function(team, force) {
          team.$delete(function(success) {
            $modalInstance.close(team);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }
    });

    modalInstance.result.then(function (team) {
      $scope.team = null;
      $scope.teams = _.reject($scope.teams, function(t) { return t.id == team.id});
    });
  }

  $scope.userFilterCl***REMOVED*** = function (filter) {
    return filter === $scope.currentUserFilter ? 'active' : '';
  }

  $scope.refresh = function() {
    $scope.users = [];
    $scope.teams = [];

    UserService.getAllUsers(true).success(function(users) {
      $scope.users = users;
      $scope.usersIdMap = _.indexBy(users, 'id');
      Team.query(function(teams) {
        $scope.teams = teams;
      });
    });
  }
});
