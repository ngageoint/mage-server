angular
  .module('mage')
  .factory('DeviceService', DeviceService);

DeviceService.$inject = ['$http', '$q'];

function DeviceService($http, $q) {
  var resolvedDevices = {};

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

  function getAllDevices() {
    var parameters = {
      expand: 'user'
    };

    var deferred = $q.defer();

    if (_.values(resolvedDevices).length === 0) {
      $http.get('/api/devices/', {params: parameters}).success(function(devices) {
        deferred.resolve(devices);
        resolvedDevices = _.indexBy(devices, 'id');
      });
    } else {
      deferred.resolve(_.values(resolvedDevices));
    }

    return deferred.promise;
  }

  function getDevice(id) {
    var parameters = {
      expand: 'user'
    };

    var deferred = $q.defer();

    if (resolvedDevices[id]) {
      deferred.resolve(resolvedDevices[id]);
    } else {
      $http.get('/api/devices/' + id, {params: parameters}).success(function(device) {
        resolvedDevices[id] = device;
        deferred.resolve(device);
      });
    }

    return deferred.promise;
  }

  function createDevice(device) {
    var promise = $http.post('/api/devices', $.param(device),{
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.then(function(data) {
      resolvedDevices[device.id] = $.when(data);
    });

    return promise;
  }

  function updateDevice(device) {
    var promise = $http.put('/api/devices/' + device.id, $.param(device), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.then(function(response) {
      resolvedDevices[response.data.id] = response.data;
    });

    return promise;
  }

  function deleteDevice(device) {
    var promise = $http.delete('/api/devices/' + device.id);

    promise.then(function() {
      delete resolvedDevices[device.id];
    });

    return promise;
  }
}
