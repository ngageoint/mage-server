'use strict';

angular.module('mage.locationService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('LocationService', ['$http', 'appConstants', 'mageLib', 
    function ($http, appConstants, mageLib) {
      var locationServiceFunctions = {};

      locationServiceFunctions.export = function () {
        return $http.get(appConstants.rootUrl + "/api/locations/export?&access_token=" + mageLib.getLocalItem('token'));
      };

      locationServiceFunctions.createLocation = function (location) {
        return $http.post(appConstants.rootUrl + '/api/locations?&access_token=' + mageLib.getLocalItem('token'), 
          JSON.stringify(location),
          {headers: {"Content-Type": "application/json"}});
      };

      locationServiceFunctions.getLocations = function () {
        return $http.get(appConstants.rootUrl + '/api/locations?&access_token=' + mageLib.getLocalItem('token'));
      }

      return locationServiceFunctions;
    }])