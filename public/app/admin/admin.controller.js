angular
  .module('mage')
  .controller('AdminController', AdminController);

AdminController.$inject = ['$scope', '$routeParams'];

function AdminController($scope, $routeParams) {
  $scope.currentAdminPanel = $routeParams.adminPanel || "user";
}
