'use strict';

angular.module('mage.locationService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('locationService', ['$http', 'appConstants', 'mageLib', 
    function ($http, appConstants, mageLib) {
      var locationServiceFunctions = {};

      locationServiceFunctions.export = function () {
        
      };

      return locationServiceFunctions;
    }])