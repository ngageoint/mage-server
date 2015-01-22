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

  // Edit form toggles
  $scope.showTeamForm = false;

  $scope.$watch('teams', function(teams) {
    $scope.filteredTeams = teams;
  });

  $scope.filterTeams = function() {
    $scope.page = 0;
    $scope.filteredTeams = $filter('filter')($scope.teams, $scope.teamSearch);
  }

  $scope.newTeam = function() {
    $scope.team = new Team();
    $scope.team.members = [];
    $scope.nonMembers = $scope.users.slice();
  }

  $scope.editTeam = function(team) {
    $scope.edit = false;
    $scope.add = false;

    $scope.team = team;
    $scope.teamMembersById = _.indexBy($scope.team.members, 'id');
    $scope.nonMembers = _.filter($scope.users, function(user) {
      return $scope.teamMembersById[user.id] == null;
    });
  }

  $scope.addMember = function(user) {
    $scope.team.members.push(user);
    $scope.nonMembers = _.reject($scope.nonMembers, function(team) { return user.id == team.id});
  }

  $scope.removeMember = function(user) {
    $scope.nonMembers.push(user);
    $scope.team.members = _.reject($scope.team.members, function(team) { return user.id == team.id});
  }

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 5000);

  $scope.saveTeam = function(team) {
    $scope.saving = true;
    $scope.error = false;
    if ($scope.team.id) {
      $scope.team.$update(function() {
        $scope.saved = true;
        $scope.saving = false;

        debounceHideSave();
      }, function(response) {
        $scope.error = response.data;
        $scope.saving = false;
      });
    } else {
      $scope.team.$create(function() {
        $scope.teams.push($scope.team);
        $scope.saved = true;
        $scope.saving = false;

        debounceHideSave();
      }, function(response) {
        $scope.error = response.data;
        $scope.saving = false;
      });
    }
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
