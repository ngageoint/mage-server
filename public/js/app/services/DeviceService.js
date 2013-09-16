'use strict';

angular.module('mage.deviceService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('DeviceService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.getAllDevices = function () {
        return $http.get(appConstants.rootUrl + '/api/devices/', {params: mageLib.getTokenParams()});
      };

      var resolvedDevices = {};

      ***REMOVED***.getDevice = function(id) {
        resolvedDevices[id] = resolvedDevices[id] || $http.get(
          appConstants.rootUrl + '/api/devices/' + id, 
          {params: mageLib.getTokenParams()}
        );
        return resolvedDevices[id];
      }

      ***REMOVED***.createDevice = function(device) {
        return $http.post(
          appConstants.rootUrl + '/api/devices?access_token=' + mageLib.getLocalItem('token'), 
          $.param(device), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.updateDevice = function(device) {
        return $http.put(
          appConstants.rootUrl + '/api/devices/' + device._id + '?access_token=' + mageLib.getLocalItem('token'), 
          $.param(device), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.registerDevice = function(device) {
        return $http.put(
          appConstants.rootUrl + '/api/devices/' + device._id + '?access_token=' + mageLib.getLocalItem('token'),
          $.param({registered: true}),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.deleteDevice = function(device) {
        return $http.delete(
          appConstants.rootUrl + '/api/devices/' + device._id + '?access_token=' + mageLib.getLocalItem('token')
        );
      }

      return ***REMOVED***;
    }]);