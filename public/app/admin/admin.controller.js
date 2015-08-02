angular
  .module('mage')
  .controller('AdminController', AdminController);

AdminController.$inject = ['$scope', '$routeParams', 'UserService', 'DeviceService', 'Team', 'Event', 'Layer'];

function AdminController($scope, $routeParams, UserService, DeviceService, Team, Event, Layer) {
  $scope.currentAdminPanel = $routeParams.adminPanel || "";

  UserService.getUserCount().success(function (data) {
    $scope.userCount = data.count;
  });

  DeviceService.count().success(function (data) {
    $scope.deviceCount = data.count;
  });

  Team.count(function (data) {
    $scope.teamCount = data.count;
  });

  Event.count(function (data) {
    $scope.eventCount = data.count;
  });

  Layer.count(function (data) {
    $scope.layerCount = data.count;
  });

}
