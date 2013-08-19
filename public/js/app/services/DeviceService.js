'use strict';

angular.module('mage.deviceService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('DeviceService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var deviceService = {};

      deviceService.getAllDevices = function () {
        return $http.get(appConstants.rootUrl + '/api/devices/', {params: mageLib.getTokenParams()});
      };

      deviceService.createDevice = function(device) {
        return $http.post(
          appConstants.rootUrl + '/api/devices?access_token=' + mageLib.getLocalItem('token'), 
          $.param(device), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      deviceService.updateDevice = function(device) {
        return $http.put(
          appConstants.rootUrl + '/api/devices/' + device._id + '?access_token=' + mageLib.getLocalItem('token'), 
          $.param(device), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      deviceService.registerDevice = function(device) {
        return $http.put(
          appConstants.rootUrl + '/api/devices/' + device._id + '?access_token=' + mageLib.getLocalItem('token'),
          $.param({registered: true}),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      deviceService.deleteDevice = function(device) {
        return $http.delete(
          appConstants.rootUrl + '/api/devices/' + device._id + '?access_token=' + mageLib.getLocalItem('token')
        );
      }

      return deviceService;
    }]);