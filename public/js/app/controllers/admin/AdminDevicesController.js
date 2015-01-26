'use strict';

angular.module('mage').controller('AdminDevicesCtrl', function ($scope, $injector, $filter, appConstants, mageLib, DeviceService, UserService) {
  $scope.token = mageLib.getLocalItem('token');
  $scope.filter = "all"; // possible values all, registered, unregistered
  $scope.devices = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  DeviceService.getAllDevices().success(function (devices) {
    $scope.devices = devices;
  });

  UserService.getAllUsers().success(function (users) {
    $scope.users = users;
  });

  $scope.$watch('devices', function(devices) {
    $scope.filteredDevices = devices;
  });

  $scope.userIdMap = {};
  $scope.$watch('users', function(users) {
    $scope.userIdMap = _.indexBy(users, 'id');
  });

  $scope.filterDevices = function() {
    $scope.page = 0;

    var filteredDevices = $filter('filter')($scope.devices, $scope.deviceSearch);
    var filteredDeviceIdMap = _.indexBy(filteredDevices, 'id');

    var filteredUsers = $filter('user')($scope.users, ['username', 'firstname', 'lastname'], $scope.deviceSearch);
    _.each(filteredUsers, function(filteredUser) {
      _.each($scope.devices, function(device) {
        if (device.userId === filteredUser.id) filteredDeviceIdMap[device.id] = device;
      });
    });

    $scope.filteredDevices = _.values(filteredDeviceIdMap);
  }

  $scope.filterRegistered = function (device) {
    switch ($scope.filter) {
      case 'all': return true;
      case 'registered': return device.registered;
      case 'unregistered': return !device.registered;
    }
  }

  $scope.newDevice = function() {
    $scope.device = {};
  }

  $scope.editDevice = function(device) {
    $scope.edit = false;
    $scope.device = device;
  }

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 5000);

  $scope.saveDevice = function () {
    $scope.saving = true;
    $scope.error = false;

    var device = $scope.device;

    if (device.id) {
      DeviceService.updateDevice(device).success(function(data) {
        $scope.saved = true;
        $scope.saving = false;
        debounceHideSave();
      })
      .error(function(response) {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    } else {
      DeviceService.createDevice(device).success(function (data) {
        $scope.saved = true;
        $scope.saving = false;
        debounceHideSave();
        $scope.devices.push(data);
      })
      .error(function (response) {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    }
  }

  $scope.deleteDevice = function(device) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/js/app/partials/admin/delete-device.html',
      resolve: {
        device: function () {
          return device;
        }
      },
      controller: function ($scope, $modalInstance, device) {
        $scope.device = device;

        $scope.deleteDevice = function(device, force) {
          DeviceService.deleteDevice(device).success(function() {
            $modalInstance.close(device);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }
    });

    modalInstance.result.then(function(device) {
      $scope.device = null;
      $scope.devices = _.reject($scope.devices, function(d) { return d.id == device.id});
    });
  }

  $scope.refresh = function() {
    $scope.devices = [];
    DeviceService.getAllDevices().success(function (devices) {
      $scope.devices = devices;
    });
  }

  $scope.registerDevice = function (device) {
    DeviceService.registerDevice(device).success(function(data) {
      $scope.$apply(function() {
        $scope.saved = true;
        debounceHideSave();
      });
    }, function(response) {
      $scope.$apply(function() {
        $scope.error = response.responseText;
      });
    });
  }
});
