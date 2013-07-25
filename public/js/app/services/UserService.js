'use strict';

angular.module('mage.userService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('UserService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.getUser = function(id) {
        return $http.get(
          appConstants.rootUrl + '/api/users/' + id, 
          {params: mageLib.getTokenParams()}
        );
      }

      ***REMOVED***.getAllUsers = function () {
        return $http.get(appConstants.rootUrl + '/api/users', {params: mageLib.getTokenParams()});
      };

      ***REMOVED***.newUser = function (user) {
        var user = {
          username: '',
          firstname: '',
          lastname: '',
          email: ''
        };

        return user;
      };

      /* the admin function, allows you to add roles */
      ***REMOVED***.createUser = function(user) {
        return $http.post(appConstants.rootUrl + '/api/users?access_token=' + mageLib.getLocalItem('token'), $.param(user), {headers: {"Content-Type": "application/x-www-form-urlencoded"}});
      }

      /* For the sign up page, no token necessary */
      ***REMOVED***.signup = function (user) {
        return $http.post(appConstants.rootUrl + '/api/users', $.param(user), {headers: {"Content-Type": "application/x-www-form-urlencoded"}});
      }

      ***REMOVED***.updateUser = function(user) {
        $http.put(appConstants.rootUrl + '/api/users/' + user._id + '?access_token=' + mageLib.getLocalItem('token'), $.param(user), {headers: {"Content-Type": "application/x-www-form-urlencoded"}}).
          success(function (data, status, headers, config) {
            console.log("sucessful user save!");
          }).
          error(function (data, status, headers, config) {
            console.log("Something bad happend while trying to save the user " + status);
          });
      }

      ***REMOVED***.getRoles = function () {
        return $http.get(appConstants.rootUrl + '/api/roles', {params: mageLib.getTokenParams()});
      };

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
      
      ***REMOVED***.getMyself = function () {
        return $http.get(appConstants.rootUrl + '/api/users/myself', {params: mageLib.getTokenParams()});
      };

      return ***REMOVED***;
    }])
