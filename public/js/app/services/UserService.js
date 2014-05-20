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
          '/api/users', $.param(data),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      }

      ***REMOVED***.signin = function (data) {
        userDeferred = $q.defer();

        var promise = $http.post(
         '/api/login',
          $.param(data),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"},ignoreAuthModule:true});

        promise.success(function(data) {
          mageLib.setLocalItem('token', data.token);
          setUser(data.user);
          if ($location.path() == '/signin') {
            $location.path('/map');
          }
        });

        return promise;
      }

      ***REMOVED***.login = function(roles) {
        var theDeferred = $q.defer();
        $http.get(
          '/api/users/myself',
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
        .success(function(user) {
          setUser(user);

          if (roles && !_.contains(roles, user.role.name)) {
            // TODO probably want to redirect to a unauthorized page.
            $location.path('/signin');
          }

          theDeferred.resolve(user);
        })
        .error(function(data, status) {
          theDeferred.resolve({});
        });

        return theDeferred.promise;
      }

      ***REMOVED***.checkLoggedInUser = function(roles) {
        console.info('check login');
        $http.get(
          '/api/users/myself',
          {
            ignoreAuthModule: true})
        .success(function(user) {
          setUser(user);
          userDeferred.resolve(user);
        })
        .error(function(data, status) {
          userDeferred.resolve({});
        });

        return userDeferred.promise;
      }

      ***REMOVED***.logout = function() {
        var promise =  $http.post('/api/logout');

        promise.success(function() {
          ***REMOVED***.clearUser();
          $location.path("/signin");
        });

        return promise;
      }

      ***REMOVED***.updateMyself = function(user) {
        return $http.put(
          '/api/users/myself',
          $.param(user),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      }

      ***REMOVED***.updateMyP***REMOVED***word = function(user) {
        var promise = $http.put(
          '/api/users/myself',
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
          '/api/users/' + id
        );
        return resolvedUsers[id];
      }

      ***REMOVED***.newUser = function (user) {
        return {username: '', firstname: '', lastname: '', email: '' };
      };

      ***REMOVED***.getAllUsers = function () {
        return $http.get('/api/users').success(function(users) {
          for (var i = 0; i < users.length; i++) {
          resolvedUsers[users[i]._id] = $q.when(users[i]);
          }
        });
      };

      ***REMOVED***.createUser = function(user) {
        return $http.post(
          '/api/users',
           $.param(user),
           {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
         );
      };

      ***REMOVED***.updateUser = function(user) {
        return $http.put(
          '/api/users/' + user._id,
          $.param(user),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );
      };

      ***REMOVED***.deleteUser = function(user) {
        return $http.delete(
          '/api/users/' + user._id
        );
      };

      ***REMOVED***.getRoles = function () {
        return $http.get('/api/roles');
      };

      ***REMOVED***.clearUser = function() {
        ***REMOVED***.myself = null;
        ***REMOVED***.amUser = null;
        ***REMOVED***.amAdmin = null;
      };

      return ***REMOVED***;
    }])
