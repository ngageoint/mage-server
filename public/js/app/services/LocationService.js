'use strict';

angular.module('mage.locationService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('LocationService', ['$http', '$q', '$rootScope', 'appConstants', 'mageLib',
    function ($http, $q, $rootScope, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.export = function () {
        return $http.get(appConstants.rootUrl + "/api/locations/export");
      };

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
              console.log('could not get location: ' + JSON.stringify(error));
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
.factory('Location', ['$resource', '$http', function($resource, $http) {
  var Location = $resource('/api/locations/users', {}, {
    get: {
      method: 'GET',
      isArray: true,
      transformResponse: _.flatten([$http.defaults.transformResponse, function(data) {
        if (data == 'Unauthorized') return data;
        return _.filter(data, function(user) {
          return user.locations.length;
        });
      }])
    }
  });

  return Location;
}])
.factory('CreateLocation', ['$resource', '$http', function($resource, $http) {
  var Location = $resource('/api/locations', {}, {
    create: {
      method: 'POST',
      isArray: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });
  Location.prototype.$save = function(params, success, error) {
    if(this.id) {
      this.$update(params, success, error);
    } else {
      this.$create(params, success, error);
    }
  }
  return Location;
}]);
