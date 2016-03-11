angular
  .module('mage')
  .controller('NotInEventController', NotInEventController);

NotInEventController.$inject = ['$scope', '$uibModalInstance', 'title'];

function NotInEventController($scope, $uibModalInstance, title) {
  $scope.title = title;

  $scope.ok = function () {
    $uibModalInstance.close();
  };
}
