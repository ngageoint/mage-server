'use strict';

angular.module('mage.userService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('UserService', ['$q', '$http', '$location', '$timeout', 'appConstants', 'mageLib',
    function ($q, $http, $location, $timeout, appConstants, mageLib) {
      var ***REMOVED*** = {
        myself: null
      };
      var userDeferred = $q.defer();

      var setUser = function(user) {
        ***REMOVED***.myself = user;
        ***REMOVED***.amUser = ***REMOVED***.myself && ***REMOVED***.myself.role && (***REMOVED***.myself.role.name == "USER_ROLE" || ***REMOVED***.myself.role.name == "ADMIN_ROLE");
        ***REMOVED***.amAdmin = ***REMOVED***.myself && ***REMOVED***.myself.role && (***REMOVED***.myself.role.name == "ADMIN_ROLE");
      };

      /* For the sign up page, no token necessary */
      ***REMOVED***.signup = function (data) {
        return $http.post(
          appConstants.rootUrl + '/api/users', $.param(data), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      }

      ***REMOVED***.signin = function (data) {
        userDeferred = $q.defer();

        var promise = $http.post(
          appConstants.rootUrl + '/api/login',
          $.param(data), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}});
        
        promise.success(function(data) {
          mageLib.setLocalItem('token', data.token);
          $location.path('/map');

          $http.get(
            appConstants.rootUrl + '/api/users/myself', 
            {params: mageLib.getTokenParams()},
            {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
          .success(function(user) {
            setUser(user);
            userDeferred.resolve(user);
          })
          .error(function(data) {
            userDeferred.reject(data);
          });
        });

        return promise;
      }

      ***REMOVED***.login = function(roles) {
        $http.get(
          appConstants.rootUrl + '/api/users/myself',
          {params: mageLib.getTokenParams()},
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
        .success(function(user) {
          setUser(user);

          if (roles && !_.contains(roles, user.role.name)) {
            // TODO probably want to redirect to a unauthorized page.
            $location.path('/signin');
          }
          
          userDeferred.resolve(user);
        })
        .error(function(data, status) {
          userDeferred.resolve({});
        });

        return userDeferred.promise;
      }

      ***REMOVED***.logout = function() {
        var promise =  $http.post(
          appConstants.rootUrl + '/api/logout?access_token=' + mageLib.getLocalItem('token'), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );

        promise.success(function() {
          ***REMOVED***.clearUser();
          $location.path("/signin");
        });

        return promise;
      }

      ***REMOVED***.updateMyself = function(user) {
        return $http.put(
          appConstants.rootUrl + '/api/users/myself?access_token=' + mageLib.getLocalItem('token'), 
          $.param(user), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      }

      ***REMOVED***.updateMyP***REMOVED***word = function(user) {
        var promise = $http.put(
          appConstants.rootUrl + '/api/users/myself?access_token=' + mageLib.getLocalItem('token'), 
          $.param(user), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
          
        promise.success(function(user) {
          ***REMOVED***.clearUser();
        });

        return promise;
      }

      ***REMOVED***.getUser = function(id) {
        return $http.get(
          appConstants.rootUrl + '/api/users/' + id, 
          {params: mageLib.getTokenParams()}
        );
      }

      ***REMOVED***.newUser = function (user) {
        return {username: '', firstname: '', lastname: '', email: '' };
      };

      ***REMOVED***.getAllUsers = function () {
        return $http.get(appConstants.rootUrl + '/api/users', {params: mageLib.getTokenParams()});
      };

      ***REMOVED***.createUser = function(user) {
        return $http.post(
          appConstants.rootUrl + '/api/users?access_token=' + mageLib.getLocalItem('token'),
           $.param(user), 
           {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
         );
      };

      ***REMOVED***.updateUser = function(user) {
        return $http.put(
          appConstants.rootUrl + '/api/users/' + user._id + '?access_token=' + mageLib.getLocalItem('token'), 
          $.param(user), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.deleteUser = function(user) {
        return $http.delete(
          appConstants.rootUrl + '/api/users/' + user._id + '?access_token=' + mageLib.getLocalItem('token')
        );
      };

      ***REMOVED***.getRoles = function () {
        return $http.get(appConstants.rootUrl + '/api/roles', {params: mageLib.getTokenParams()});
      };

      ***REMOVED***.clearUser = function() {
        ***REMOVED***.myself = null;
        ***REMOVED***.amUser = null;
        ***REMOVED***.amAdmin = null;
      };

      return ***REMOVED***;
    }])
