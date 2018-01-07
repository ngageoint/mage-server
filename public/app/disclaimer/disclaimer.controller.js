module.exports = DisclaimerController;

DisclaimerController.$inject = ['$scope', '$uibModalInstance', 'disclaimer'];

function DisclaimerController($scope, $uibModalInstance, disclaimer) {
  $scope.disclaimer = disclaimer;

  $scope.accept = function() {
    $uibModalInstance.close();
  };

  $scope.exit = function() {
    $uibModalInstance.dismiss();
  };
}
