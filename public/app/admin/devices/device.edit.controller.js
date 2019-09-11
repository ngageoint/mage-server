var _ = require('underscore')
  , angular = require('angular');

module.exports = AdminDeviceEditController;

AdminDeviceEditController.$inject = ['$scope', '$routeParams', '$location', 'LocalStorageService', 'DeviceService', 'UserService'];

function AdminDeviceEditController($scope, $routeParams, $location, LocalStorageService, DeviceService, UserService) {
  $scope.token = LocalStorageService.getToken();

  if ($routeParams.deviceId) {
    DeviceService.getDevice($routeParams.deviceId).then(function(device) {
      $scope.device = angular.copy(device);
    });
  } else {
    $scope.device = {};
  }

  UserService.getAllUsers().then(function (users) {
    $scope.users = users;
  });

  $scope.userIdMap = {};
  $scope.$watch('users', function(users) {
    $scope.userIdMap = _.indexBy(users, 'id');
  });

  $scope.iconClass = function(device) {
    return DeviceService.iconClass(device);
  };

  $scope.iconClass = function(device) {
    if (device.iconClass) return device.iconClass;

    var userAgent = device.userAgent || "";

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon';
    } else if (userAgent.toLowerCase().indexOf("android") !== -1) {
      device.iconClass = 'fa-android admin-android-icon';
    } else if(userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon';
    }

    return device.iconClass;
  };

  $scope.cancel = function() {
    var path = $scope.device.id ? '/admin/devices/' + $scope.device.id : '/admin/devices';
    $location.path(path);
  };

  $scope.saveDevice = function () {
    $scope.saving = true;
    $scope.error = false;

    var device = $scope.device;
    if (device.user.id) {
      device.userId = device.user.id;
    }

    if (device.id) {
      DeviceService.updateDevice(device).then(function() {
        $location.path('/admin/devices/' + device.id);
      }, function(response) {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    } else {
      DeviceService.createDevice(device).then(function (newDevice) {
        $location.path('/admin/devices/' + newDevice.id);
      }, function (response) {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    }
  };
}
