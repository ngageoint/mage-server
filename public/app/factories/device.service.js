angular
  .module('mage')
  .factory('DeviceService', DeviceService )

DeviceService.$inject = ['$http'];

function DeviceService($http) {
  var resolvedDevices = {};

  var ***REMOVED*** = {
    getAllDevices: getAllDevices,
    getDevice: getDevice,
    createDevice: createDevice,
    updateDevice: updateDevice,
    registerDevice: registerDevice,
    deleteDevice: deleteDevice
  };

  return ***REMOVED***;

  function getAllDevices() {
    return $http.get('/api/devices/');
  };


  function getDevice(id) {
    resolvedDevices[id] = resolvedDevices[id] || $http.get(
      '/api/devices/' + id
    );
    return resolvedDevices[id];
  }

  function createDevice(device) {
    return $http.post(
      '/api/devices',
      $.param(device),
      {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
    );
  };

  function updateDevice(device) {
    return $http.put(
      '/api/devices/' + device.id,
      $.param(device),
      {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
    );
  };

  function registerDevice(device) {
    return $http.put(
      '/api/devices/' + device.id,
      $.param({registered: true}),
      {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
    );
  };

  function deleteDevice(device) {
    return $http.delete(
    '/api/devices/' + device.id
    );
  }
}
