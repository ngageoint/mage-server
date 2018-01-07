AdminTeamEditController.$inject = ['$scope', '$location', '$routeParams', 'Team'];

module.exports = AdminTeamEditController;

function AdminTeamEditController($scope, $location, $routeParams, Team) {
  if ($routeParams.teamId) {
    Team.get({id: $routeParams.teamId}, function(team) {
      $scope.team = team;
    });
  } else {
    $scope.team = new Team();
  }

  $scope.saveTeam = function(team) {
    $scope.team.$save(function() {
      $location.path('/admin/teams/' + team.id);
    });
  };

  $scope.cancel = function() {
    var path = $scope.team.id ? '/admin/teams/' + $scope.team.id : '/admin/teams';
    $location.path(path);
  };
}
