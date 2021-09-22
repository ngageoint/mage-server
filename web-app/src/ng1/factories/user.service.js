var _ = require('underscore');

module.exports = UserService;

UserService.$inject = ['$rootScope', '$q', '$http', '$httpParamSerializer', '$location', '$state', '$window', 'LocalStorageService'];

function UserService($rootScope, $q, $http, $httpParamSerializer, $location, $state, $window, LocalStorageService) {

  const service = {
    myself: null,
    amAdmin: false,
    signup,
    signupVerify,
    signin,
    idpSignin,
    ldapSignin,
    authorize,
    acceptDisclaimer,
    logout,
    getMyself,
    updatePassword,
    updateMyPassword,
    updateMyself,
    checkLoggedInUser,
    getUserCount,
    getUser,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    clearUser,
    getRoles,
    hasPermission,
    addRecentEvent,
    getRecentEventId
  };

  return service;

  function signup(username) {
    const deferred = $q.defer();

    $http.post('/api/users/signups', { username: username }, {
      headers: {
        'Content-Type': 'application/json'
      },
      ignoreAuthModule: true
    }).then(function (response) {
      deferred.resolve(response.data);
    }).catch(function (response) {
      deferred.reject(response);
    });

    return deferred.promise;
  }

  function signupVerify(data, token) {
    const deferred = $q.defer();

    $http.post('/api/users/signups/verifications', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      ignoreAuthModule: true
    }).then(function (response) {
      deferred.resolve(response.data);
    }).catch(function (response) {
      deferred.reject(response);
    });

    return deferred.promise;
  }

  function ldapSignin(data) {
    const deferred = $q.defer();

    data.appVersion = 'Web Client';
    $http.post('/auth/ldap/signin', data, {
      headers: {"Content-Type": "application/json"},
      ignoreAuthModule:true
    }).then(function(response) {
      deferred.resolve(response.data);
    }).catch(function(response) {
      deferred.reject(response);
    });

    return deferred.promise;
  }

  function idpSignin(strategy) {
    const deferred = $q.defer();

    const url = "/auth/" + strategy + "/signin";
    const authWindow = $window.open(url, "_blank");

    function onMessage(event) {
      $window.removeEventListener('message', onMessage, false);

      if (event.origin !== $location.protocol() + "://" + $location.host()) {
        return;
      }

      deferred.resolve(event.data);

      authWindow.close();
    }

    $window.addEventListener('message', onMessage, false);

    return deferred.promise;
  }

  function authorize(token, uid, newUser = false) {
    const params = {
      uid: uid,
      appVersion: 'Web Client'
    };

    const promise = $http.post('/auth/token?createDevice=false', $httpParamSerializer(params), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      ignoreAuthModule:true
    });

    promise.success(function(data) {
      if (data.device.registered) {
        setUser(data.user);
        LocalStorageService.setToken(data.token);
        $rootScope.$broadcast('event:auth-login', {token: data.token, newUser: newUser});
        return data;
      }
    });

    return promise;
  }

  function acceptDisclaimer() {
    $rootScope.$broadcast('event:user', {user: service.myself, token: LocalStorageService.getToken(), isAdmin: service.amAdmin});
  }

  function signin(data) {
    const deferred = $q.defer();

    data.appVersion = 'Web Client';
    $http.post('/auth/local/signin', $httpParamSerializer(data), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      ignoreAuthModule:true
    }).then(function(response) {
      deferred.resolve(response.data);
    }).catch(function(response) {
      deferred.reject(response);
    });

    return deferred.promise;
  }

  function logout() {
    var promise =  $http.post('/api/logout');

    promise.success(function() {
      clearUser();
      $state.go("landing");
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

  function updatePassword(userId, authentication) {
    return $http.put(`/api/users/${userId}/password`, authentication, {
      headers: { "Content-Type": "application/json" }
    });
  }

  function updateMyPassword(authentication) {
    const promise = $http.put('/api/users/myself/password', authentication, {
      headers: {"Content-Type": "application/json"},
      ignoreAuthModule:true
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

  function getUserCount(options) {
    options = options || {};

    return $http.get('/api/users/count', {params: options});
  }

  function getUser(id, options) {
    options = options || {};

    const deferred = $q.defer();

    const parameters = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    $http.get('/api/users/' + id, { params: parameters }).success(function (user) {
      deferred.resolve(user);
    });

    return deferred.promise;
  }

  function getAllUsers(options) {
    options = options || {};
    const deferredUsers = $q.defer();

    $http.get('/api/users', {params: options})
      .success(function(data) {
        if(Object.prototype.toString.call(data) === '[object Array]'){
          deferredUsers.resolve(_.indexBy(data, 'id'));
        }else{
          deferredUsers.resolve(data);
        }
      });

    return deferredUsers.promise;
  }

  function createUser(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users?access_token=' + LocalStorageService.getToken(),
      type: 'POST'
    }, function(user) {
      if (_.isFunction(success)) {
        success(user);
      }
    }, error, progress);
  }

  function updateMyself(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/myself?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, function(user) {
      if (_.isFunction(success)) {
        success(user);
      }
    }, error, progress);
  }

  function updateUser(id, user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/' + id + '?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, function(user) {
      if (_.isFunction(success)) {
        success(user);
      }
    }, error, progress);
  }

  function deleteUser(user) {
    var deferred = $q.defer();

    $http.delete('/api/users/' + user.id)
      .success(function() {
        deferred.resolve();
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

    jQuery.ajax({
      url: options.url,
      type: options.type,
      xhr: function() {
        var myXhr = jQuery.ajaxSettings.xhr();
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
