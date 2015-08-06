angular
  .module('mage')
  .controller('AdminTeamEditController', AdminTeamEditController);

AdminTeamEditController.$inject = ['$scope', '$injector', '$location', '$routeParams', 'LocalStorageService', 'ObservationService', 'UserService', 'Team'];

function AdminTeamEditController($scope, $injector, $location, $routeParams, LocalStorageService, ObservationService, UserService, Team) {
  $scope.token = LocalStorageService.getToken();

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
    }, function(reponse) {

    });
  }

  $scope.cancel = function() {
    $location.path('/admin/teams/' + $scope.team.id);
  }

}
