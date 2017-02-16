angular
  .module('mage')
  .controller('AdminTeamDeleteController', AdminTeamDeleteController);

AdminTeamDeleteController.$inject = ['$scope', '$q', '$uibModalInstance', 'UserService', 'team'];

function AdminTeamDeleteController($scope, $q, $uibModalInstance, UserService, team) {
  $scope.team = team;
  $scope.confirm = {};

  $scope.deleteTeam = function(team) {
    $scope.deleting = true;

    var users = team.users;
    team.$delete(function() {
      if ($scope.deleteUsers && ($scope.confirm.text === team.name)) {
        deleteUsers(users);
      } else {
        $uibModalInstance.close(team);
      }
    });
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  function deleteUsers(users) {
    var promises = [];
    _.each(users, function(user) {
      promises.push(deleteUser(user));
    });

    $q.all(promises).then(function() {
      // TODO done
      console.log('deleted all users that were part of the team.');
      $uibModalInstance.close(team);
    });
  }

  function deleteUser(user) {
    var deferred = $q.defer();

    UserService.deleteUser(user).then(function() {
      deferred.resolve();
    }, function() {
      deferred.resolve();
    });

    return deferred.promise;
  }
}
