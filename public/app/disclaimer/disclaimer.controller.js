angular
  .module('mage')
  .controller('DisclaimerController', DisclaimerController);

DisclaimerController.$inject = ['$scope', '$modalInstance', 'AboutService'];

function DisclaimerController($scope, $modalInstance, AboutService) {

  AboutService.about().success(function(api) {
    $scope.disclaimer = api.disclaimer;
  });

  $scope.accept = function() {
    $modalInstance.close();
  }

  $scope.exit = function() {
    $modalInstance.dismiss();
  }
}
