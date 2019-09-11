var angular = require('angular');

module.exports = DeleteObservationController;

DeleteObservationController.$inject = ['$scope', '$uibModalInstance', 'EventService', 'observation'];

function DeleteObservationController($scope, $uibModalInstance, EventService, observation) {
  $scope.observation = observation;
  $scope.event = angular.copy(EventService.getEventById($scope.observation.eventId));

  $scope.closeModal = function () {
    $uibModalInstance.dismiss('cancel');
  };

  $scope.delete = function() {
    EventService.archiveObservation($scope.observation).then(function() {
      $scope.$emit('observation:delete',  $scope.observation);
    });
  };
}
