var _ = require('underscore')
  , $ = require('jquery');

module.exports = UserService;

UserService.$inject = ['$rootScope', '$q', '$uibModal', '$http', '$location', '$timeout', '$window', 'LocalStorageService'];

function UserService($rootScope, $q, $uibModal, $http, $location, $timeout, $window, LocalStorageService) {

  var service = {
    myself: null,
    amAdmin: false,
    signup: signup,
    signin: signin,
    googleSignin: googleSignin,
    googleSignup: googleSignup,
    ldapSignin: ldapSignin,
    oauthSignin: oauthSignin,
    authorize: authorize,
    logout: logout,
    getMyself: getMyself,
    updateMyPassword: updateMyPassword,
    updateMyself: updateMyself,
    checkLoggedInUser: checkLoggedInUser,
    getUserCount: getUserCount,
    getUser: getUser,
    getAllUsers: getAllUsers,
    createUser: createUser,
    updateUser: updateUser,
    deleteUser: deleteUser,
    clearUser: clearUser,
    getRoles: getRoles,
    hasPermission: hasPermission,
    addRecentEvent: addRecentEvent,
    getRecentEventId: getRecentEventId
  };

  return service;

  function signup(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users',
      type: 'POST'
    }, success, error, progress);
  }

  function googleSignup(user, success, error, progress) {
    saveUser(user, {
      url: '/auth/google/signup',
      type: 'POST'
    }, success, error, progress);
  }

  function googleSignin(data) {
    var oldUsername = service.myself && service.myself.username || null;

    data.appVersion = 'Web Client';
    var promise = $http.post('/auth/google/signin', $.param(data), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      ignoreAuthModule:true
    });

    promise.success(function(data) {
      setUser(data.user);
      LocalStorageService.setToken(data.token);
      $rootScope.$broadcast('event:auth-login', {token: data.token, newUser: data.user.username !== oldUsername});
      $rootScope.$broadcast('event:user', {user: data.user, token: data.token, isAdmin: service.amAdmin});
    });

    return promise;
  }

  function ldapSignin(data) {
    var deferred = $q.defer();

    data.appVersion = 'Web Client';
    $http.post('/auth/ldap/signin', data, {
      headers: {"Content-Type": "application/json"},
      ignoreAuthModule:true
    }).then(function(response) {
      deferred.resolve({user: response.data.user});
    }).catch(function(response) {
      deferred.reject(response);
    });

    return deferred.promise;
  }

  function oauthSignin(strategy) {
    var deferred = $q.defer();

    var oldUsername = service.myself && service.myself.username || null;

    var windowLeft = window.screenLeft ? window.screenLeft : window.screenX;
    var windowTop = window.screenTop ? window.screenTop : window.screenY;

    var left = windowLeft + (window.innerWidth / 2) - (300);
    var top = windowTop + (window.innerHeight / 2) - (300);
    var strWindowFeatures = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=600, top=' + top + ',left=' + left;

    var url = "/auth/" + strategy + "/signin";
    var authWindow = $window.open(url, "", strWindowFeatures);

    function onMessage(event) {
      $window.removeEventListener('message', onMessage, false);

      if (event.origin !== $location.protocol() + "://" + $location.host()) {
        return;
      }

      deferred.resolve({success: event.data.success, user: event.data.user, oauth: event.data.oauth});

      authWindow.close();
    }

    $window.addEventListener('message', onMessage, false);

    return deferred.promise;
  }

  function authorize(strategy, user, newUser, authData) {
    var data = {
      access_token: authData.access_token,
      uid: authData.uid,
      appVersion: 'Web Client'
    };

    var promise = $http.post('/auth/' + strategy + '/authorize', $.param(data), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      ignoreAuthModule:true
    });

    promise.success(function(data) {
      if (data.device.registered) {
        setUser(data.user);
        LocalStorageService.setToken(data.token);
        $rootScope.$broadcast('event:auth-login', {token: data.token, newUser: newUser});
        $rootScope.$broadcast('event:user', {user: data.user, token: data.token, isAdmin: service.amAdmin});
      }
    });

    return promise;
  }

  function signin(data) {
    var deferred = $q.defer();

    data.appVersion = 'Web Client';
    $http.post('/auth/local/signin', $.param(data), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      ignoreAuthModule:true
    }).then(function(response) {
      deferred.resolve({user: response.data.user});
    }).catch(function(response) {
      deferred.reject(response);
    });

    return deferred.promise;
  }

  function logout() {
    var promise =  $http.post('/api/logout');

    promise.success(function() {
      clearUser();
      $location.path("/signin");
    });

    return promise;
  }

  function getMyself() {
    var theDeferred = $q.defer();
    $http.get('/api/users/myself',{
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    }).success(function(user) {
      setUser(user);

      $rootScope.$broadcast('event:user', {user: user, token: LocalStorageService.getToken(), isAdmin: service.amAdmin});

      theDeferred.resolve(user);
    }).error(function() {
      theDeferred.resolve({});
    });

    return theDeferred.promise;
  }

  function updateMyPassword(authentication) {
    var promise = $http.put('/api/users/myself/password', $.param(authentication), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.success(function() {
      clearUser();
    });

    return promise;
  }

  function checkLoggedInUser() {
    var deferred = $q.defer();

    $http.get('/api/users/myself', {ignoreAuthModule: true})
      .success(function(user) {
        setUser(user);
        deferred.resolve(user);
      })
      .error(function() {
        deferred.resolve({});
      });

    return deferred.promise;
  }

  function getUserCount() {
    return $http.get('/api/users/count');
  }

  var deferredUsers;
  function getUserMap(options) {
    options = options || {};

    if (options.forceRefresh || !deferredUsers) {
      deferredUsers = $q.defer();

      var parameters = {};
      if (options && options.populate) {
        parameters.populate = options.populate;
      }

      $http.get('/api/users', {params: parameters})
        .success(function(users) {
          deferredUsers.resolve(_.indexBy(users, 'id'));
        });
    }

    return deferredUsers.promise;
  }

  function getUser(id, options) {
    options = options || {};

    var deferred = $q.defer();

    if (options.forceRefresh) {
      var parameters = {};
      if (options.populate) {
        parameters.populate = options.populate;
      }

      // Go get user again
      $http.get('/api/users/' + id, {params: parameters}).success(function(user) {
        // Grab my map of users without a refresh and update with new user
        getUserMap().then(function(userMap) {
          userMap[user.id] = user;
          deferred.resolve(user);
        });
      });
    } else {
      getUserMap().then(function(userMap) {
        if (!userMap[id]) {
          // could be our cache of users is stale, lets check the server for this user
          $http.get('/api/users/' + id, {params: parameters}).success(function(user) {
            // Grab my map of users without a refresh and update with new user
            getUserMap().then(function(userMap) {
              userMap[id] = user;
              deferred.resolve(user);
            }).error(function() {
              deferred.resolve(null);
            });
          });
        } else {
          deferred.resolve(userMap[id]);
        }
      });
    }

    return deferred.promise;
  }

  function getAllUsers(options) {
    options = options || {};

    var deferred = $q.defer();

    getUserMap(options).then(function(userMap) {
      deferred.resolve(_.values(userMap));
    });

    return deferred.promise;
  }

  function createUser(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users?access_token=' + LocalStorageService.getToken(),
      type: 'POST'
    }, function(user) {
      if (_.isFunction(success)) {
        getUserMap().then(function(userMap) {
          userMap[user.id] = user;
          success(user);
        });
      }
    }, error, progress);
  }

  function updateMyself(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/myself?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, function(user) {
      if (_.isFunction(success)) {
        getUserMap().then(function(userMap) {
          userMap[user.id] = user;
          success(user);
        });
      }
    }, error, progress);
  }

  function updateUser(id, user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/' + id + '?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, function(user) {
      if (_.isFunction(success)) {
        getUserMap().then(function(userMap) {
          userMap[user.id] = user;
          success(user);
        });
      }
    }, error, progress);
  }

  function deleteUser(user) {
    var deferred = $q.defer();

    $http.delete('/api/users/' + user.id)
      .success(function() {
        getUserMap().then(function(userMap) {
          delete userMap[user.id];
          deferred.resolve();
        });
      });

    return deferred.promise;
  }

  // TODO is this really used in this service or just internal
  function clearUser() {
    service.myself = null;
    service.amAdmin = null;
    LocalStorageService.removeToken();

    $rootScope.$broadcast('logout');
  }

  // TODO should this go in Roles service/resource
  function getRoles() {
    return $http.get('/api/roles');
  }

  function hasPermission(permission) {
    return _.contains(service.myself.role.permissions, permission);
  }

  // TODO possibly name this addRecentEventForMyself
  function addRecentEvent(event) {
    return $http.post('/api/users/' + service.myself.id + '/events/' + event.id + '/recent');
  }

  function getRecentEventId() {
    var recentEventIds = service.myself.recentEventIds;
    return recentEventIds.length > 0 ? recentEventIds[0]: null;
  }

  function setUser(user) {
    service.myself = user;
    // TODO don't just check for role name
    service.amAdmin = service.myself && service.myself.role && (service.myself.role.name === "ADMIN_ROLE" || service.myself.role.name === 'EVENT_MANAGER_ROLE');
  }

  function saveUser(user, options, success, error, progress) {
    var formData = new FormData();
    for (var property in user) {
      if (user[property] != null) {
        formData.append(property, user[property]);
      }
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
      success: function(data) {
        success(data);
      },
      error: error,
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    });
  }
}
