angular
  .module('mage')
  .controller('AdminUserController', AdminUserController);

AdminUserController.$inject = ['$scope', '$modal', '$filter', '$routeParams', '$location', '$q', 'LocalStorageService', 'UserService', 'Team'];

function AdminUserController($scope, $modal, $filter, $routeParams, $location, $q, LocalStorageService, UserService, Team) {
  $scope.userTeams = [];
  $scope.nonTeams = [];
  $scope.teamsPage = 0;
  $scope.teamsPerPage = 10;

  $q.all({user: UserService.getUser($routeParams.userId), teams: Team.query({populate: false}).$promise}).then(function(result) {
    $scope.user = result.user.data || result.user;
    $scope.avatarUrl = avatarUrl($scope.user, LocalStorageService.getToken());
    $scope.iconUrl = iconUrl($scope.user, LocalStorageService.getToken());

    $scope.teams = result.teams;
    teamsById = _.indexBy(result.teams, 'id');

    $scope.team = {};
    $scope.userTeams = _.filter($scope.teams, function(team) {
      return _.some(team.users, function(user) {
        return $scope.user.id == user.id;
      });
    });

    $scope.nonTeams = _.reject($scope.teams, function(team) {
      return _.some(team.users, function(user) {
        return $scope.user.id == user.id;
      });
    });
  });

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;
  });

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;
  });

  $scope.editUser = function(user) {
    $location.path('/admin/users/' + user.id + '/edit');
  }

  function avatarUrl(user, token) {
    if (user && user.avatarUrl) {
      return user.avatarUrl + "?access_token=" + token;
    } else {
      return "img/missing_photo.png";
    }
  }

  function iconUrl(user, token) {
    if (user && user.iconUrl) {
      return user.iconUrl + "?access_token=" + token;
    } else {
      return "img/missing_marker.png";
    }
  }

  $scope.addUserToTeam = function(team) {
    Team.addUser({id: team.id}, $scope.user, function(team) {
      $scope.userTeams.push(team);
      $scope.nonTeams = _.reject($scope.nonTeams, function(t) { return t.id == team.id });

      $scope.team = {};
    });
  }

  $scope.removeUserFromTeam = function($event, team) {
    $event.stopPropagation();

    Team.removeUser({id: team.id, userId: $scope.user.id}, function(team) {
      $scope.userTeams = _.reject($scope.userTeams, function(t) { return t.id == team.id; });
      $scope.nonTeams.push(team);
    });
  }

  $scope.deleteUser = function(user) {
    var modalInstance = $modal.open({
      templateUrl: '/app/admin/users/user-delete.html',
      resolve: {
        user: function () {
          return user;
        }
      },
      controller: ['$scope', '$modalInstance', 'user', function ($scope, $modalInstance, user) {
        $scope.user = user;

        $scope.deleteUser = function(user, force) {
          UserService.deleteUser(user).success(function() {
            $modalInstance.close(user);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(user) {
      $location.path('/admin/users');
    });
  }

  /* shortcut for giving a user the USER_ROLE */
  $scope.activateUser = function(user) {
    user.active = true;
    UserService.updateUser(user.id, user, function(response) {
    }, function(response) {
    });
  }

  $scope.deactivateUser = function (user) {
    user.active = false;
    UserService.updateUser(user.id, user, function(response) {

    }, function(response) {

    });
  }

  $scope.gotoTeam = function(team) {
    $location.path('/admin/teams/' + team.id);
  }
}
