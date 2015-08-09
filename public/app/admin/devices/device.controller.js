angular
  .module('mage')
  .controller('AdminDeviceController', AdminDeviceController);

AdminDeviceController.$inject = ['$scope', '$injector', '$filter', '$routeParams', '$location', 'LocalStorageService', 'DeviceService', 'UserService'];

function AdminDeviceController($scope, $injector, $filter, $routeParams, $location, LocalStorageService, DeviceService, UserService) {
  $scope.token = LocalStorageService.getToken();

  DeviceService.getDevice($routeParams.deviceId).then(function(device) {
    $scope.device = device.data;
  });

  UserService.getAllUsers().success(function (users) {
    $scope.users = users;
  });

  $scope.userIdMap = {};
  $scope.$watch('users', function(users) {
    $scope.userIdMap = _.indexBy(users, 'id');
  });

  $scope.editDevice = function(device) {
    $location.path('/admin/devices/' + device.id + '/edit');
  }

  $scope.deleteDevice = function(device) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/devices/device-delete.html',
      resolve: {
        device: function () {
          return device;
        }
      },
      controller: ['$scope', '$modalInstance', 'device', function ($scope, $modalInstance, device) {
        $scope.device = device;

        $scope.deleteDevice = function(device, force) {
          DeviceService.deleteDevice(device).success(function() {
            $modalInstance.close(device);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(device) {
      $location.path('/admin/devices');
    });
  }

  $scope.registerDevice = function (device) {
    device.registered = true;
    DeviceService.updateDevice(device).success(function(data) {
    }, function(response) {
    });
  }

  $scope.unregisterDevice = function (device) {
    device.registered = false;
    DeviceService.updateDevice(device).success(function(data) {
    }, function(response) {
    });
  }
}
