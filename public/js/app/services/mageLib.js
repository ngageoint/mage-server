'use strict';

/* A library of common functions for doing geolocation, Local Storage, etc */
angular.module('mage.lib', [])
  .factory('mageLib', ['$http', '$location',
    function ($scope, $http, $location) {
      var libFunctions = {};

      libFunctions.geolocate = function () {
        // add geolocation code here
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
          if ('localStorage' in window && window['localStorage'] !== null) {
            return localStorage.setItem(key, value);
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