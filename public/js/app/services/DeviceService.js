'use strict';

angular.module('mage.deviceService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('DeviceService', ['appConstants', 'mageLib', '$http',
    function (appConstants, mageLib, $http) {
      var deviceServiceFunctions = {};

      deviceServiceFunctions.getAllDevices = function () {
        return $http.get(appConstants.rootUrl + '/api/devices/', {params: mageLib.getTokenParams()});
      };

      return deviceServiceFunctions;
    }])