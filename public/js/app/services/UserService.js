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
          {headers: {"Content-Type": "application/x-www-form-urlencoded"},ignoreAuthModule:true});
        
        promise.success(function(data) {
          console.info('set the mage token to ' + data.token);
          mageLib.setLocalItem('token', data.token);
          console.info('mage lib token is ' + mageLib.getToken());
          console.info('path is ' + $location.path());
          if ($location.path() == '/signin') {
            $location.path('/map');
          }
          // $location.path('/map');

          // $http.get(
          //   appConstants.rootUrl + '/api/users/myself', 
          //   {params: mageLib.getTokenParams()},
          //   {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
          // .success(function(user) {
          //   setUser(user);
          //   userDeferred.resolve(user);
          // })
          // .error(function(data) {
          //   userDeferred.reject(data);
          // });
        });

        return promise;
      }

      ***REMOVED***.login = function(roles) {
        var theDeferred = $q.defer();
        $http.get(
          appConstants.rootUrl + '/api/users/myself',
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
        .success(function(user) {
          console.info('set the user', user);
          setUser(user);

          if (roles && !_.contains(roles, user.role.name)) {
            // TODO probably want to redirect to a unauthorized page.
            $location.path('/signin');
          }
          
          theDeferred.resolve(user);
        })
        .error(function(data, status) {
          console.info('BAD user');
          theDeferred.resolve({});
        });

        return theDeferred.promise;
      }

      ***REMOVED***.checkLoggedInUser = function(roles) {
        console.info('check login');
        $http.get(
          appConstants.rootUrl + '/api/users/myself',
          {
            ignoreAuthModule: true})
        .success(function(user) {
          console.info('set the user', user);
          setUser(user);
          userDeferred.resolve(user);
        })
        .error(function(data, status) {
          console.info('BAD user');
          userDeferred.resolve({});
        });

        return userDeferred.promise;
      }

      ***REMOVED***.logout = function() {
        var promise =  $http.get(
          appConstants.rootUrl + '/api/logout'
        );

        promise.success(function() {
          ***REMOVED***.clearUser();
          $location.path("/signin");
        });

        return promise;
      }

      ***REMOVED***.updateMyself = function(user) {
        return $http.put(
          appConstants.rootUrl + '/api/users/myself', 
          $.param(user), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      }

      ***REMOVED***.updateMyP***REMOVED***word = function(user) {
        var promise = $http.put(
          appConstants.rootUrl + '/api/users/myself', 
          $.param(user), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
          
        promise.success(function(user) {
          ***REMOVED***.clearUser();
        });

        return promise;
      }

      var resolvedUsers = {};

      ***REMOVED***.getUser = function(id) {
        resolvedUsers[id] = resolvedUsers[id] || $http.get(
          appConstants.rootUrl + '/api/users/' + id
        );
        return resolvedUsers[id];
      }

      ***REMOVED***.newUser = function (user) {
        return {username: '', firstname: '', lastname: '', email: '' };
      };

      ***REMOVED***.getAllUsers = function () {
        return $http.get(appConstants.rootUrl + '/api/users').success(function(users) {
          for (var i = 0; i < users.length; i++) {
          resolvedUsers[users[i]._id] = $q.when(users[i]);
          }
          console.info('resolved users ');
          console.info(resolvedUsers);
        });
      };

      ***REMOVED***.createUser = function(user) {
        return $http.post(
          appConstants.rootUrl + '/api/users',
           $.param(user), 
           {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
         );
      };

      ***REMOVED***.updateUser = function(user) {
        return $http.put(
          appConstants.rootUrl + '/api/users/' + user._id, 
          $.param(user), 
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.deleteUser = function(user) {
        return $http.delete(
          appConstants.rootUrl + '/api/users/' + user._id
        );
      };

      ***REMOVED***.getRoles = function () {
        return $http.get(appConstants.rootUrl + '/api/roles');
      };

      ***REMOVED***.clearUser = function() {
        ***REMOVED***.myself = null;
        ***REMOVED***.amUser = null;
        ***REMOVED***.amAdmin = null;
      };

      return ***REMOVED***;
    }])
