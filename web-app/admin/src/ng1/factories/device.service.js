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

    return $http.get('/api/devices/count', { params: options });
  }

  function getAllDevices(options) {
    options = options || {};

    var deferred = $q.defer();

    $http.get('/api/devices', { params: options })
      .success(function (devices) {
        deferred.resolve(devices);
      });

    return deferred.promise;
  }

  function getDevice(id, options) {
    options = options || {};

    var deferred = $q.defer();
    $http.get('/api/devices/' + id, { params: { expand: 'user' } }).success(function (device) {
      deferred.resolve(device);
    }).error(function () {
      deferred.reject();
    });

    return deferred.promise;
  }

  function createDevice(device) {
    var deferred = $q.defer();

    $http.post('/api/devices', $httpParamSerializer(device), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }).success(function (updatedDevice) {
      deferred.resolve(updatedDevice);
    }).error(function () {
      deferred.reject();
    });

    return deferred.promise;
  }

  function updateDevice(device) {
    var deferred = $q.defer();

    $http.put('/api/devices/' + device.id, $httpParamSerializer(device), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }).success(function () {
      deferred.resolve(device);
    }).error(function () {
      deferred.reject();
    });

    return deferred.promise;
  }

  function deleteDevice(device) {
    var deferred = $q.defer();

    $http.delete('/api/devices/' + device.id).success(function () {
      deferred.resolve(device);
    });

    return deferred.promise;
  }
}
