angular
  .module('mage')
  .controller('AdminTeamsController', AdminTeamsController);

AdminTeamsController.$inject = ['$scope', '$uibModal', '$filter', '$location', 'Team'];

function AdminTeamsController($scope, $uibModal, $filter, $location, Team) {
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

  $scope.deleteTeam = function($event, team) {
    $event.stopPropagation();

    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/teams/team-delete.html',
      resolve: {
        team: function () {
          return team;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'team', function ($scope, $uibModalInstance, team) {
        $scope.team = team;

        $scope.deleteTeam = function(team) {
          team.$delete(function() {
            $uibModalInstance.close(team);
          });
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (team) {
      $scope.teams = _.reject($scope.teams, function(t) { return t.id === team.id; });
    });
  };
}
