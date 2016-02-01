angular
  .module('mage')
  .controller('AdminTeamEditController', AdminTeamEditController);

AdminTeamEditController.$inject = ['$scope', '$location', '$routeParams', 'Team'];

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
    $location.path('/admin/teams/' + $scope.team.id);
  };
}
