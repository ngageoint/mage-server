'use strict';

angular.module('mage.userService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('UserService', ['appConstants', 'mageLib', '$http',
    function (appConstants, mageLib, $http) {
      var userServiceFunctions = {};

      userServiceFunctions.getAllUsers = function () {
        return $http.get(appConstants.rootUrl + '/api/users/', {params: mageLib.getTokenParams()});
      };

      userServiceFunctions.newUser = function (user) {

      };

      userServiceFunctions.createUser = function(user) {
        $http.post(appConstants.rootUrl + '/api/users', $.param(user), {headers: {"Content-Type": "x-www-form-urlencoded"}}).
          success(function (data, status, headers, config) {
            console.log("sucessful user save!");
          }).
          error(function (data, status, headers, config) {
            console.log("Something bad happend while trying to save the user " + status);
          });
      }

      /*var user =
        $resource(appConstants.rootUrl + '\::port/api/users/:id', { // may need to alter this to have :port after the url, would then need to add port below the same way that :id is handled.
          id:'@id',
          port: '4242',
          }, {
            update: {method: 'PUT'},
            newUser : {
              method : 'POST',
              headers : {'Content-Type': 'application/x-www-form-urlencoded'},
            }
          });*/
      

      return userServiceFunctions;
    }])