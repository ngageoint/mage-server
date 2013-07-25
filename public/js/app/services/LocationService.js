'use strict';

angular.module('mage.locationService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('LocationService', ['$http', '$q', '$rootScope', 'appConstants', 'mageLib', 
    function ($http, $q, $rootScope, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.export = function () {
        return $http.get(appConstants.rootUrl + "/api/locations/export?&access_token=" + mageLib.getLocalItem('token'));
      };

      ***REMOVED***.createLocation = function (location) {
        return $http.post(appConstants.rootUrl + '/api/locations?&access_token=' + mageLib.getLocalItem('token'), 
          JSON.stringify(location),
          {headers: {"Content-Type": "application/json"}});
      };

      ***REMOVED***.getLocations = function () {
        return $http.get(appConstants.rootUrl + '/api/locations?&access_token=' + mageLib.getLocalItem('token'));
      }

      ***REMOVED***.getPosition = function() {
        var deferred = $q.defer();
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (position) {
              $rootScope.$apply(function() {
                deferred.resolve(position);
              });
            },
            function (error) {
              deferred.reject(error);
            }
          );
        }
        else {
          deferred.reject('location ***REMOVED***s not allowed');
        }

        return deferred.promise;
      }

      return ***REMOVED***;
    }])