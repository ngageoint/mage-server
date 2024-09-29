var _ = require('underscore');

module.exports = DeviceService;

DeviceService.$inject = ['$http', '$q', '$httpParamSerializer'];

function DeviceService($http, $q, $httpParamSerializer) {

  var service = {
    count: count,
    getAllDevices: getAllDevices,
    getDevice: getDevice,
    createDevice: createDevice,
    updateDevice: updateDevice,
    deleteDevice: deleteDevice
  };

  return service;

  function count(options) {
    options = options || {};
    return $http.get('/api/devices/count', { params: options }).then(res => res.data)
  }

  function getAllDevices(options) {
    options = options || {};
    return $http.get('/api/devices', { params: options }).then(res => res.data)
  }

  function getDevice(id, options) {
    options = options || {};
    return $http.get('/api/devices/' + id, { params: { expand: 'user' } }).then(res => res.data)
  }

  function createDevice(device) {
    return $http.post('/api/devices', $httpParamSerializer(device), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    .then(res => res.data)
  }

  function updateDevice(device) {
    return $http.put('/api/devices/' + device.id, $httpParamSerializer(device), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    .then(res => res.data)
  }

  function deleteDevice(device) {
    return $http.delete('/api/devices/' + device.id).then(res => res.data)
  }
}
