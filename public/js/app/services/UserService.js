'use strict';

angular.module('mage.userService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('UserService', ['$rootScope', '$q', '$http', '$location', '$timeout', 'appConstants', 'mageLib',
    function ($rootScope, $q, $http, $location, $timeout, appConstants, mageLib) {
      var ***REMOVED*** = {
        myself: null
      };
      var userDeferred = $q.defer();

      var setUser = function(user) {
        ***REMOVED***.myself = user;
        ***REMOVED***.amAdmin = ***REMOVED***.myself && ***REMOVED***.myself.role && (***REMOVED***.myself.role.name == "ADMIN_ROLE");
      };

      function saveUser(user, options, success, error, progress) {
        var formData = new FormData();
        for (var property in user) {
          if (user[property] != null)
            formData.append(property, user[property]);
        }

        $.ajax({
            url: options.url,
            type: options.type,
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress', progress, false);
                }
                return myXhr;
            },
            success: success,
            error: error,
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });
      }

      /* For the sign up page, no token necessary */
      ***REMOVED***.signup = function (user, success, error, progress) {
        saveUser(user, {
          url: '/api/users',
          type: 'POST'
        }, success, error, progress);
      }

      ***REMOVED***.login = function (data) {
        userDeferred = $q.defer();

        var promise = $http.post(
         '/api/login',
          $.param(data),
          {headers: {"Content-Type": "application/x-www-form-urlencoded"},ignoreAuthModule:true});

        promise.success(function(data) {
          mageLib.setLocalItem('token', data.token);
          setUser(data.user);

          $rootScope.$broadcast('login', {user: data.user, token: data.token, isAdmin: ***REMOVED***.amAdmin});

          if ($location.path() == '/signin') {
            $location.path('/map');
          }
        });

        return promise;
      }

      ***REMOVED***.getMyself = function(roles) {
        var theDeferred = $q.defer();
        $http.get(
          '/api/users/myself',
          {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
        .success(function(user) {
          setUser(user);

          $rootScope.$broadcast('login', {user: user, token: mageLib.getToken(), isAdmin: ***REMOVED***.amAdmin});

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

      ***REMOVED***.updateMyself = function(user, success, error, progress) {
        saveUser(user, {
          url: '/api/users/myself?access_token=' + mageLib.getLocalItem('token'),
          type: 'PUT'
        }, success, error, progress);
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
            resolvedUsers[users[i].id] = $q.when(users[i]);
          }
        });
      };

      ***REMOVED***.createUser = function(user, success, error, progress) {
        saveUser(user, {
          url: '/api/users?access_token=' + mageLib.getLocalItem('token'),
          type: 'POST'
        }, success, error, progress);
      };

      ***REMOVED***.updateUser = function(id, user, success, error, progress) {
        saveUser(user, {
          url: '/api/users/' + id + '?access_token=' + mageLib.getLocalItem('token'),
          type: 'PUT'
        }, success, error, progress);
      };

      ***REMOVED***.deleteUser = function(user) {
        return $http.delete(
          '/api/users/' + user.id
        );
      };

      ***REMOVED***.getRoles = function () {
        return $http.get('/api/roles');
      };

      ***REMOVED***.clearUser = function() {
        ***REMOVED***.myself = null;
        ***REMOVED***.amAdmin = null;

        // mageLib.removeLocalItem('token');

        $rootScope.$broadcast('logout');
      };

      return ***REMOVED***;
    }])
