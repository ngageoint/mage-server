'use strict';

angular.module('mage').controller('AdminDevicesCtrl', function ($scope, $injector, appConstants, mageLib, DeviceService, $filter) {

  $scope.currentDeviceFilter = "all"; // possible values all, registered, unregistered
  $scope.token = mageLib.getLocalItem('token');
  $scope.appConstants = appConstants;

  $scope.device = {};
  $scope.devices = [];
  $scope.filteredDevices = [];
  DeviceService.getAllDevices().
    success(function (data) {
      $scope.devices = data;
      $scope.filteredDevices = $scope.devices;
      $scope.deviceSearch();
    });

  // Edit form toggles
  $scope.showDeviceForm = false;
  $scope.showNewDeviceButton = true;

  $scope.setShowDeviceForm = function (visibility) {
    $scope.showDeviceForm = visibility;
    $scope.showNewDeviceButton = !visibility;
  }

  $scope.changeCurrentDeviceFilter = function (filter) {
    $scope.deviceQuery = '';
    $scope.currentDeviceFilter = filter;
    if (filter == 'all') {
      $scope.filteredDevices = $scope.devices;
    } else if ( filter == "registered") {
      $scope.filteredDevices = $scope.getRegisteredDevices($scope.devices);
    } else {
      $scope.filteredDevices = $scope.getUnregisteredDevices($scope.devices);
    }
  }

  $scope.deviceFilterCl***REMOVED*** = function (filter) {
    return filter === $scope.currentDeviceFilter ? 'active' : '';
  }

  $scope.scrollTo = function (id) {
    var old = $location.hash();
    $location.hash(id);
    $anchorScroll();
    $location.hash(old);
  }

  $scope.editDevice = function (device) {
    $scope.device = device;
    $scope.setShowDeviceForm(true);
    $scope.scrollTo('device-form');
  }

  $scope.saveDevice = function () {
    var device = $scope.device;

    if (device._id) {
      DeviceService.updateDevice(device)
        .success(function(data) {
          $scope.showStatusMessage("Success", "Device '" + device.uid + "' has been updated.","alert-info");
          $scope.setShowDeviceForm(false);
        })
        .error(function(data) {
          $scope.showStatusMessage("Unable to update device", data, "alert-error");
        });
    } else {
      DeviceService.createDevice(device)
        .success(function (data) {
          $scope.showStatusMessage("Success", "Device '" + device.uid + "' has been created.","alert-info");
          $scope.devices.push(data);
          $scope.setShowDeviceForm(false);
          $scope.deviceSearch();
        })
        .error(function (data) {
          $scope.showStatusMessage("Unable to create device", data, "alert-error");
        });
    }
  }

  $scope.registerDevice = function(device) {
    DeviceService.registerDevice(device)
      .success(function(data, status) {
        device.registered = true;
        device.registeredThisSession = true;
      })
      .error(function(data, status) {
        $scope.showStatusMessage("Unable to register device", data, "alert-error");
      });
  }

  $scope.deleteDevice = function (device) {
    DeviceService.deleteDevice(device)
      .success(function() {
        $scope.devices = _.reject($scope.devices, function(d) { return d.uid === device.uid });
        device.deleted = "true";
      })
      .error(function() {
        $scope.showStatusMessage("Unable to delete device", data, "alert-error");
      });
  }

  $scope.getUnregisteredDevices = function (devices) {
    var result = [];
    angular.forEach(devices, function (device) {
      if (device.registered == false) {
        result.push(device);
      }
    });
    return result;
  }

  $scope.getRegisteredDevices = function (devices) {
    var result = [];
    angular.forEach(devices, function (device) {
      if (device.registered == true) {
        result.push(device);
      }
    });
    return result;
  }

  var searchMatch = function (property, query) {
    if (!query) {
      return true;
    } else if (!property) {
      return false;
    }

    return property.toLowerCase().indexOf(query.toLowerCase()) !== -1;
  };

  $scope.deviceSearch = function () {
    $scope.filteredDevices = $filter('filter')($scope.devices, function (device) {
      if (searchMatch(device['name'], $scope.deviceQuery) || searchMatch(device['uid'], $scope.deviceQuery) ||
        searchMatch(device['description'], $scope.deviceQuery)) {
        return true;
      }
      return false;
    });

    if ($scope.currentDeviceFilter == 'registered') {
      $scope.filteredDevices = $scope.getRegisteredDevices($scope.filteredDevices);
    } else if ($scope.currentDeviceFilter == 'unregistered') {
      $scope.filteredDevices = $scope.getUnregisteredDevices($scope.filteredDevices);
    }
  }

  $scope.refreshDevices = function() {
    $scope.devices = [];
    $scope.filteredDevices = [];
    DeviceService.getAllDevices().
      success(function (data) {
        $scope.devices = data;
        $scope.filteredDevices = $scope.devices;
        $scope.deviceSearch();
      });
  }
});
