angular
  .module('mage')
  .factory('UserService', UserService);

UserService.$inject = ['$rootScope', '$q', '$http', '$location', '$timeout', 'LocalStorageService'];

function UserService($rootScope, $q, $http, $location, $timeout, LocalStorageService) {
  var userDeferred = $q.defer();
  var resolvedUsers = {};
  var resolveAllUsers = null;

  var ***REMOVED*** = {
    myself: null,
    amAdmin: false,
    signup: signup,
    oauthSignin: oauthSignin,
    oauthSignup: oauthSignup,
    login: login,
    logout: logout,
    getMyself: getMyself,
    updateMyP***REMOVED***word: updateMyP***REMOVED***word,
    updateMyself: updateMyself,
    checkLoggedInUser: checkLoggedInUser,
    getUserCount: getUserCount,
    getUser: getUser,
    getAllUsers: getAllUsers,
    getInactiveUsers: getInactiveUsers,
    createUser: createUser,
    updateUser: updateUser,
    deleteUser: deleteUser,
    clearUser: clearUser,
    getRoles: getRoles,
    addRecentEvent: addRecentEvent,
    getRecentEventId: getRecentEventId
  };

  return ***REMOVED***;

  function signup(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users',
      type: 'POST'
    }, success, error, progress);
  }

  function oauthSignin(strategy) {
    var deferred = $q.defer();

    windowLeft = window.screenLeft ? window.screenLeft : window.screenX;
    windowTop = window.screenTop ? window.screenTop : window.screenY;

    var left = windowLeft + (window.innerWidth / 2) - (300);
    var top = windowTop + (window.innerHeight / 2) - (300);
    var strWindowFeatures = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=600, top=' + top + ',left=' + left;

    var authWindow = $window.open("/auth/" +  strategy + "/signin", "", strWindowFeatures);
    $window.addEventListener('message', function(event) {
      if (event.origin !== $location.protocol() + "://" + $location.host()) {
        return;
      }

      var data = event.data;
      if (data.token) {
        LocalStorageService.setToken(event.data.token);
        setUser(event.data.user);
        deferred.resolve({user: event.data.user, token: LocalStorageService.getToken(), isAdmin: ***REMOVED***.amAdmin});
      } else {
        deferred.reject(data);
      }

      authWindow.close();
    }, false);

    return deferred.promise;
  }

  function oauthSignup(strategy) {
    var deferred = $q.defer();

    windowLeft = window.screenLeft ? window.screenLeft : window.screenX;
    windowTop = window.screenTop ? window.screenTop : window.screenY;

    var left = windowLeft + (window.innerWidth / 2) - (300);
    var top = windowTop + (window.innerHeight / 2) - (300);
    var strWindowFeatures = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=600, top=' + top + ',left=' + left;

    var authWindow = $window.open("/auth/" +  strategy + "/signup", "", strWindowFeatures);
    $window.addEventListener('message', function(event) {
      var data = event.data;
      if (data.user) {
        setUser(event.data.user);
        deferred.resolve({user: event.data.user});
      } else {
        deferred.reject(data);
      }

      authWindow.close();
    }, false);

    return deferred.promise;
  }

  function login(data) {
    userDeferred = $q.defer();

    var oldUsername = ***REMOVED***.myself && ***REMOVED***.myself.username || null;

    data.appVersion = 'Web Client';
    var promise = $http.post('/api/login', $.param(data), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      ignoreAuthModule:true
    });

    promise.success(function(data) {
      setUser(data.user);
      $rootScope.$broadcast('event:auth-login', {token: data.token, newUser: data.user.username !== oldUsername});
      $rootScope.$broadcast('event:user', {user: data.user, token: data.token, isAdmin: ***REMOVED***.amAdmin});
    });

    return promise;
  }

  function logout() {
    var promise =  $http.post('/api/logout');

    promise.success(function() {
      clearUser();
      $location.path("/signin");
    });

    return promise;
  }

  function getMyself(roles) {
    var theDeferred = $q.defer();
    $http.get('/api/users/myself',{
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    })
    .success(function(user) {
      if (user.id !== ***REMOVED***.myself)

      setUser(user);

      $rootScope.$broadcast('event:user', {user: user, token: LocalStorageService.getToken(), isAdmin: ***REMOVED***.amAdmin});

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

  function updateMyself(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/myself?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, success, error, progress);
  }

  function updateMyP***REMOVED***word(user) {
    var promise = $http.put('/api/users/myself', $.param(user), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.success(function(user) {
      clearUser();
    });

    return promise;
  }

  function checkLoggedInUser(roles) {
    console.info('check login');
    $http.get('/api/users/myself', {ignoreAuthModule: true})
    .success(function(user) {
      setUser(user);
      userDeferred.resolve(user);
    })
    .error(function(data, status) {
      userDeferred.resolve({});
    });

    return userDeferred.promise;
  }

  function getUserCount() {
    return $http.get('/api/users/count');
  }

  function getUser(id) {
    return resolvedUsers[id] || $http.get('/api/users/' + id, {});
  }

  function getAllUsers(options) {
    var options = options || {};

    if (options.forceRefresh) {
        resolvedUsers = {};
        resolveAllUsers = undefined;
    }

    var parameters = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    resolveAllUsers = resolveAllUsers || $http.get('/api/users', {params: parameters}).success(function(users) {
      for (var i = 0; i < users.length; i++) {
        resolvedUsers[users[i]._id] = $q.when(users[i]);
      }
    });

    return resolveAllUsers;
  };

  function getInactiveUsers() {
    return $http.get('/api/users?active=false');
  };

  function createUser(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users?access_token=' + LocalStorageService.getToken(),
      type: 'POST'
    }, function(data) {
      resolvedUsers[data.id] = $q.when(data);
      success(data);
    }, error, progress);
  };

  function updateUser(id, user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/' + id + '?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, function(data) {
      resolvedUsers[data.id] = $q.when(data);
      success(data);
    }, error, progress);
  };

  function deleteUser(user) {
    var promise = $http.delete('/api/users/' + user.id);
    promise.success(function() {
      delete resolvedUsers[user.id];
    });

    return promise;
  };

  // TODO is this really used in this ***REMOVED*** or just internal
  function clearUser() {
    ***REMOVED***.myself = null;
    ***REMOVED***.amAdmin = null;
    LocalStorageService.removeToken();

    $rootScope.$broadcast('logout');
  };

  // TODO should this go in Roles ***REMOVED***/resource
  function getRoles() {
    return $http.get('/api/roles');
  };

  // TODO possibly name this addRecentEventForMyself
  function addRecentEvent(event) {
    return $http.post('/api/users/' + ***REMOVED***.myself.id + '/events/' + event.id + '/recent');
  }

  function getRecentEventId() {
    var recentEventIds = ***REMOVED***.myself.recentEventIds;
    return recentEventIds.length > 0 ? recentEventIds[0]: null;
  }

  function setUser(user) {
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
        success: function(data) {
          resolvedUsers[user.id] = $q.when(data);
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
