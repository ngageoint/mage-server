angular
  .module('mage')
  .factory('DeviceService', DeviceService);

DeviceService.$inject = ['$http', '$q'];

function DeviceService($http, $q) {

  var service = {
    count: count,
    getAllDevices: getAllDevices,
    getDevice: getDevice,
    createDevice: createDevice,
    updateDevice: updateDevice,
    deleteDevice: deleteDevice
  };

  return service;

  function count() {
    return $http.get('/api/devices/count');
  }

  var deferredDevices;
  function getDeviceMap(options) {
    options = options || {};

    if (options.forceRefresh || !deferredDevices) {
      deferredDevices = $q.defer();

      $http.get('/api/devices', { params: { expand: 'user' } })
        .success(function(devices) {
          deferredDevices.resolve(_.indexBy(devices, 'id'));
        });
    }

    return deferredDevices.promise;
  }

  function getAllDevices(options) {
    options = options || {};

    var deferred = $q.defer();

    getDeviceMap(options).then(function(deviceMap) {
      deferred.resolve(_.values(deviceMap));
    });

    return deferred.promise;
  }

  function getDevice(id, options) {
    options = options || {};

    var deferred = $q.defer();

    if (options.forceRefresh) {
      // Go get device again
      $http.get('/api/devices/' + id, { params: { expand: 'user' } }).success(function(device) {
        // Grab my map of devices without a refresh and update with new device
        getDeviceMap().then(function(deviceMap) {
          deviceMap[device.id] = device;
          deferred.resolve(device);
        });
      });
    } else {
      getDeviceMap().then(function(deviceMap) {
        if (!deviceMap[id]) {
          // could be our cache of users is stale, lets check the server for this device
          $http.get('/api/devices/' + id, { params: { expand: 'user' } }).success(function(device) {
            // Grab my map of users without a refresh and update with new user
            getDeviceMap().then(function(deviceMap) {
              deviceMap[id] = device;
              deferred.resolve(device);
            }, function() {
              deferred.resolve(null);
            });
          });
        } else {
          deferred.resolve(deviceMap[id]);
        }
      });
    }

    return deferred.promise;
  }

  function createDevice(device) {
    var deferred = $q.defer();

    $http.post('/api/devices', $.param(device),{
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    }).success(function(updatedDevice) {
      getDeviceMap().then(function(deviceMap) {
        updatedDevice.user = device.user;
        deviceMap[device.id] = updatedDevice;
        deferred.resolve(updatedDevice);
      });
    }).error(function() {
      deferred.reject();
    });

    return deferred.promise;
  }

  function updateDevice(device) {
    var deferred = $q.defer();

    $http.put('/api/devices/' + device.id, $.param(device), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    }).success(function() {
      getDeviceMap().then(function(deviceMap) {
        deviceMap[device.id] = device;
        deferred.resolve(device);
      });
    }).error(function() {
      deferred.reject();
    });

    return deferred.promise;
  }

  function deleteDevice(device) {
    var deferred = $q.defer();

    $http.delete('/api/devices/' + device.id).success(function() {
      getDeviceMap.then(function(deviceMap) {
        delete deviceMap[device.id];
        deferred.resolve(device);
      });
    });

    return deferred.promise;
  }
}
