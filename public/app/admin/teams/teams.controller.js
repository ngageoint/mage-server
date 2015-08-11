angular
  .module('mage')
  .controller('AdminTeamsController', AdminTeamsController);

AdminTeamsController.$inject = ['$scope', '$injector', '$filter', '$location', 'Team'];

function AdminTeamsController($scope, $injector, $filter, $location, Team) {
  $scope.teams = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  Team.query(function(teams) {
    $scope.teams = teams;
  });

  $scope.filterTeams = function(team) {
    var filteredTeams = $filter('filter')([team], $scope.teamSearch);
    return filteredTeams && filteredTeams.length;
  }

  $scope.reset = function() {
    $scope.page = 0;
    $scope.teamSearch = '';
  }

  $scope.newTeam = function() {
    $location.path('/admin/teams/new');
  }

  $scope.gotoTeam = function(team) {
    $location.path('/admin/teams/' + team.id);
  }

  $scope.editTeam = function($event, team) {
    $event.stopPropagation();

    $location.path('/admin/teams/' + team.id + '/edit');
  }

  $scope.deleteTeam = function($event, team) {
    $event.stopPropagation();

    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/teams/team-delete.html',
      resolve: {
        team: function () {
          return team;
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
      $scope.teams = _.reject($scope.teams, function(t) { return t.id == team.id});
    });
  }
}
