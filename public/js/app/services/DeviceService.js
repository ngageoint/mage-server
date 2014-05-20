'use strict';

angular.module('mage.deviceService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('DeviceService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.getAllDevices = function () {
        return $http.get('/api/devices/');
      };

      var resolvedDevices = {};

      ***REMOVED***.getDevice = function(id) {
        resolvedDevices[id] = resolvedDevices[id] || $http.get(
          '/api/devices/' + id
        );
        return resolvedDevices[id];
      }

      ***REMOVED***.createDevice = function(device) {
        return $http.post(
          '/api/devices',
          $.param(device),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.updateDevice = function(device) {
        return $http.put(
          '/api/devices/' + device._id,
          $.param(device),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.registerDevice = function(device) {
        return $http.put(
          '/api/devices/' + device._id,
          $.param({registered: true}),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.deleteDevice = function(device) {
        return $http.delete(
        '/api/devices/' + device._id
        );
      }

      return ***REMOVED***;
    }]);
