angular
  .module('mage')
  .factory('DeviceService', DeviceService )

DeviceService.$inject = ['$http'];

function DeviceService($http) {
  var resolvedDevices = {};

  var ***REMOVED*** = {
    count: count,
    getAllDevices: getAllDevices,
    getDevice: getDevice,
    createDevice: createDevice,
    updateDevice: updateDevice,
    deleteDevice: deleteDevice
  };

  return ***REMOVED***;

  function count() {
    return $http.get('/api/devices/count');
  }

  function getAllDevices() {
    return $http.get('/api/devices/');
  };

  function getDevice(id) {
    return resolvedDevices[id] || $http.get('/api/devices/' + id);
  }

  function createDevice(device) {
    var promise = $http.post('/api/devices', $.param(device),{
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.then(function(data) {
      resolvedDevices[device.id] = $.when(data);
    });

    return promise;
  };

  function updateDevice(device) {
    var promise = $http.put('/api/devices/' + device.id, $.param(device), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.then(function(data) {
      resolvedDevices[device.id] = $.when(data);
    });

    return promise;
  };

  function deleteDevice(device) {
    var promise = $http.delete('/api/devices/' + device.id);

    promise.then(function(data) {
      delete resolvedDevices[device.id];
    });

    return promise;
  }
}
