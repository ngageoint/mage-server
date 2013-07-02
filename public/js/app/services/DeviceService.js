'use strict';

angular.module('mage.deviceService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('DeviceService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var deviceServiceFunctions = {};

      deviceServiceFunctions.getAllDevices = function () {
        return $http.get(appConstants.rootUrl + '/api/devices/', {params: mageLib.getTokenParams()});
      };

      deviceServiceFunctions.createDevice = function(device) {
        console.log('in createDevice...');
        $http.post(appConstants.rootUrl + '/api/devices?access_token=' + mageLib.getLocalItem('token'), $.param(device), {headers: {"Content-Type": "application/x-www-form-urlencoded"}}).
          success(function (data, status, headers, config) {
            console.log("sucessful device save!");
          }).
          error(function (data, status, headers, config) {
            console.log("Something bad happend while trying to save the device " + status);
          });
      }

      deviceServiceFunctions.updateDevice = function(device) {
        $http.put(appConstants.rootUrl + '/api/devices/' + device.uid + '?access_token=' + mageLib.getLocalItem('token'), $.param(device), {headers: {"Content-Type": "application/x-www-form-urlencoded"}}).
          success(function (data, status, headers, config) {
            console.log("sucessful device save!");
          }).
          error(function (data, status, headers, config) {
            console.log("Something bad happend while trying to save the device " + status);
          });
      }

      return deviceServiceFunctions;
    }])