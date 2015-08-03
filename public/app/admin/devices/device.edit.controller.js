angular
  .module('mage')
  .controller('AdminDeviceEditController', AdminDeviceEditController);

AdminDeviceEditController.$inject = ['$scope', '$injector', '$filter', '$routeParams', '$location', 'LocalStorageService', 'DeviceService', 'UserService'];

function AdminDeviceEditController($scope, $injector, $filter, $routeParams, $location, LocalStorageService, DeviceService, UserService) {
  $scope.token = LocalStorageService.getToken();

  if ($routeParams.deviceId) {
    DeviceService.getDevice($routeParams.deviceId).then(function(device) {
      $scope.device = angular.copy(device.data);
    });
  } else {
    $scope.device = {};
  }

  UserService.getAllUsers().success(function (users) {
    $scope.users = users;
  });

  $scope.userIdMap = {};
  $scope.$watch('users', function(users) {
    $scope.userIdMap = _.indexBy(users, 'id');
  });

  $scope.cancel = function() {
    $location.path('/admin/devices/' + $scope.device.id);
  }

  $scope.saveDevice = function () {
    $scope.saving = true;
    $scope.error = false;

    var device = $scope.device;

    if (device.id) {
      DeviceService.updateDevice(device).success(function(data) {
        $location.path('/admin/devices/' + $scope.device.id);
      })
      .error(function(response) {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    } else {
      DeviceService.createDevice(device).success(function (data) {
        $location.path('/admin/devices/' + $scope.device.id);
      })
      .error(function (response) {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    }
  }
}
