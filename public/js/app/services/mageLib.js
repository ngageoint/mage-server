'use strict';

/* A library of common functions for doing geolocation, Local Storage, etc */
angular.module('mage.lib', [])
  .factory('mageLib', ['$location',
    function ($scope, $location) {
      var libFunctions = {};

      // options for the options { enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
      libFunctions.geolocate = function (success, error, options) {
        if (window.navigator.geolocation) {
          window.navigator.geolocation.getCurrentPosition(success, error, options);
        }
      };

      libFunctions.geoError = function (error) {
        var errors = {
          1: 'Permission denied',
          2: 'Position unavailable',
          3: 'Request timeout'
        };
        console.log("Geolocation error: " + [errors[error.code]]);
      };

      /* Wrappers for Local Storage */
      libFunctions.getLocalItem = function (key) {
        try {
          if ('localStorage' in window && window['localStorage'] !== null) {
            return localStorage.getItem(key);
          }
        } catch (e) {
          console.log("HTML5 Local Storage is not available...");
          return false;
        }
      }

      libFunctions.setLocalItem = function (key, value) {
        try {
          if ('localStorage' in window && window.localStorage !== null) {
            return localStorage.setItem(key, value);
          }
        } catch (e) {
          console.log("HTML5 Local Storage is not available...");
          return false;
        }
      }

      libFunctions.removeLocalItem = function (key) {
        try {
          if ('localStorage' in window && window.localStorage !== null) {
            return localStorage.removeItem(key);
          }
        } catch (e) {
          console.log("HTML5 Local Storage is not available...");
          return false;
        }
      }

      /* URL Param token convenience method */
      libFunctions.getTokenParams = function () {
        return {"access_token" : libFunctions.getLocalItem('token')};
      };

      libFunctions.getToken = function() {
        return libFunctions.getLocalItem('token');
      };

      /* From Year of Moo */
      libFunctions.changeLocation = function(url) {
        //this will mark the URL change
        console.log('changing location to: ' + url);
        $location.path(url).replace(); //use $location.path(url).replace() if you want to replace the location instead

        /*$scope = $scope || angular.element(document).scope();
        if(force || !$scope.$$phase) {
          //this will kickstart angular if to notice the change
          $scope.$apply();
        }*/
      };

      return libFunctions;
    }])
