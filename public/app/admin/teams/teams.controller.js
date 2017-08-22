angular
  .module('mage')
  .controller('AdminTeamsController', AdminTeamsController);

AdminTeamsController.$inject = ['$scope', '$uibModal', '$filter', '$location', 'Team', 'UserService'];

function AdminTeamsController($scope, $uibModal, $filter, $location, Team, UserService) {
  $scope.teams = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  Team.query(function(teams) {
    $scope.teams = _.reject(teams, function(team) { return team.teamEventId; });
  });

  $scope.filterTeams = function(team) {
    var filteredTeams = $filter('filter')([team], $scope.teamSearch);
    return filteredTeams && filteredTeams.length;
  };

  $scope.reset = function() {
    $scope.page = 0;
    $scope.teamSearch = '';
  };

  $scope.newTeam = function() {
    $location.path('/admin/teams/new');
  };

  $scope.gotoTeam = function(team) {
    $location.path('/admin/teams/' + team.id);
  };

  $scope.editTeam = function($event, team) {
    $event.stopPropagation();

    $location.path('/admin/teams/' + team.id + '/edit');
  };

  $scope.hasUpdatePermission = function(team) {
    return hasPermission(team, 'update');
  };

  $scope.hasDeletePermission = function(team) {
    return hasPermission(team, 'delete');
  };

  function hasPermission(team, permission) {
    var myAccess = team.acl[UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];

    switch(permission) {
    case 'update':
      return _.contains(UserService.myself.role.permissions, 'UPDATE_TEAM') || _.contains(aclPermissions, 'update');
    case 'delete':
      return _.contains(UserService.myself.role.permissions, 'DELETE_TEAM') || _.contains(aclPermissions, 'delete');
    }
  }

  $scope.deleteTeam = function($event, team) {
    $event.stopPropagation();

    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/teams/team-delete.html',
      resolve: {
        team: function () {
          return team;
        }
      },
      controller: 'AdminTeamDeleteController'
    });

    modalInstance.result.then(function (team) {
      $scope.teams = _.reject($scope.teams, function(t) { return t.id === team.id; });
    });
  };
}
