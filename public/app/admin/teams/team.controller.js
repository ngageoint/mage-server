angular
  .module('mage')
  .controller('AdminTeamController', AdminTeamController);

AdminTeamController.$inject = ['$scope', '$injector', '$location', '$routeParams', 'Team', 'UserService'];

function AdminTeamController($scope, $injector, $location, $routeParams, Team, UserService) {
  $scope.edit = false;
  $scope.usersPage = 0;
  $scope.usersPerPage = 10;
  $scope.team = {
    users: []
  }

  UserService.getAllUsers(true).success(function(users) {
    $scope.users = users;
    $scope.usersIdMap = _.indexBy(users, 'id');

    Team.get({id: $routeParams.teamId}, function(team) {
      $scope.team = team;
      $scope.user = {};
      $scope.teamUsersById = _.indexBy($scope.team.users, 'id');
      $scope.nonUsers = _.filter($scope.users, function(user) {
        return $scope.teamUsersById[user.id] == null;
      });
    });
  });

  $scope.editTeam = function(team) {
    $location.path('/admin/teams/' + team.id + '/edit');
  }

  $scope.addUser = function(user) {
    $scope.user = {};
    $scope.team.users.push(user);
    $scope.nonUsers = _.reject($scope.nonUsers, function(u) { return user.id == u.id});

    saveTeam($scope.team);
  }

  $scope.removeUser = function(user) {
    $scope.nonUsers.push(user);
    $scope.team.users = _.reject($scope.team.users, function(u) { return user.id == u.id});

    saveTeam($scope.teams);
  }

  $scope.filterUsers = function(user) {
    var filteredTeams = $filter('filter')([team], $scope.teamSearch);
    if (filteredTeams && filteredTeams.length) {
      return true;
    } else {
      return false;
    }
  }

  function saveTeam(team) {
    $scope.team.$save(function() {
    }, function(reponse) {
    });
  }

  $scope.deleteTeam = function(team) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/teams/team-delete.html',
      resolve: {
        team: function () {
          return $scope.team;
        }
      },
      controller: ['$scope', '$modalInstance', 'team', function ($scope, $modalInstance, team) {
        $scope.team = team;

        $scope.deleteTeam = function(team, force) {
          team.$delete(function(success) {
            $modalInstance.close(team);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (team) {
      $location.path('/admin/teams');
    });
  }
}
