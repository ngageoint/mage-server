angular
  .module('mage')
  .controller('DisclaimerController', DisclaimerController);

DisclaimerController.$inject = ['$scope', '$modalInstance', 'disclaimer'];

function DisclaimerController($scope, $modalInstance, disclaimer) {
  $scope.disclaimer = disclaimer;

  $scope.accept = function() {
    $modalInstance.close();
  };

  $scope.exit = function() {
    $modalInstance.dismiss();
  };
}
