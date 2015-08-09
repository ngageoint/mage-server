angular
  .module('mage')
  .controller('NotInEventController', NotInEventController);

NotInEventController.$inject = ['$scope', '$modalInstance', 'title'];

function NotInEventController($scope, $modalInstance, title) {
  $scope.title = title;

  $scope.ok = function () {
    $modalInstance.close();
  };
}
