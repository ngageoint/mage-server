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

  function login(data) {
    userDeferred = $q.defer();

    data.appVersion = 'Web Client';
    var promise = $http.post('/api/login', $.param(data), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      ignoreAuthModule:true
    });

    promise.success(function(data) {
      LocalStorageService.setToken(data.token);
      setUser(data.user);

      $rootScope.$broadcast('login', {user: data.user, token: data.token, isAdmin: ***REMOVED***.amAdmin});

      if ($location.path() == '/signin') {
        $location.path('/map');
      }
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
      setUser(user);

      $rootScope.$broadcast('login', {user: user, token: LocalStorageService.getToken(), isAdmin: ***REMOVED***.amAdmin});

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

  function getAllUsers(forceRefresh) {
    if (forceRefresh) {
        resolvedUsers = {};
        resolveAllUsers = undefined;
    }

    resolveAllUsers = resolveAllUsers || $http.get('/api/users').success(function(users) {
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
