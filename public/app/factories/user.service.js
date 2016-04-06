angular
  .module('mage')
  .factory('UserService', UserService);

UserService.$inject = ['$rootScope', '$q', '$http', '$location', '$timeout', '$window', 'LocalStorageService'];

function UserService($rootScope, $q, $http, $location, $timeout, $window, LocalStorageService) {
  var userDeferred = $q.defer();
  var resolvedUsers = {};
  var resolveAllUsers = true;

  var service = {
    myself: null,
    amAdmin: false,
    signup: signup,
    oauthSignin: oauthSignin,
    oauthSignup: oauthSignup,
    login: login,
    logout: logout,
    getMyself: getMyself,
    updateMyPassword: updateMyPassword,
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

  return service;

  function signup(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users',
      type: 'POST'
    }, success, error, progress);
  }

  function oauthSignin(strategy, data) {
    var deferred = $q.defer();

    var oldUsername = service.myself && service.myself.username || null;

    var windowLeft = window.screenLeft ? window.screenLeft : window.screenX;
    var windowTop = window.screenTop ? window.screenTop : window.screenY;

    var left = windowLeft + (window.innerWidth / 2) - (300);
    var top = windowTop + (window.innerHeight / 2) - (300);
    var strWindowFeatures = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=600, top=' + top + ',left=' + left;

    var url = "/auth/" + strategy + "/signin?" + $.param({uid: data.uid});
    var authWindow = $window.open(url, "", strWindowFeatures);

    function onMessage(event) {
      $window.removeEventListener('message', onMessage, false);

      if (event.origin !== $location.protocol() + "://" + $location.host()) {
        return;
      }

      var data = event.data;
      if (data.token) {
        LocalStorageService.setToken(data.token);
        setUser(data.user);
        $rootScope.$broadcast('event:auth-login', {token: data.token, newUser: data.user.username !== oldUsername});
        $rootScope.$broadcast('event:user', {user: data.user, token: data.token, isAdmin: service.amAdmin});
        deferred.resolve({user: event.data.user, token: data.token, isAdmin: service.amAdmin});
      } else {
        deferred.reject(data);
      }

      authWindow.close();
    }

    $window.addEventListener('message', onMessage, false);

    return deferred.promise;
  }

  function oauthSignup(strategy) {
    var deferred = $q.defer();

    var windowLeft = window.screenLeft ? window.screenLeft : window.screenX;
    var windowTop = window.screenTop ? window.screenTop : window.screenY;

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

    var oldUsername = service.myself && service.myself.username || null;

    data.appVersion = 'Web Client';
    var promise = $http.post('/api/login', $.param(data), {
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

      $rootScope.$broadcast('event:user', {user: user, token: LocalStorageService.getToken(), isAdmin: service.amAdmin});

      if (roles && !_.contains(roles, user.role.name)) {
        // TODO probably want to redirect to a unauthorized page.
        $location.path('/signin');
      }

      theDeferred.resolve(user);
    })
    .error(function() {
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

  function updateMyPassword(user) {
    var promise = $http.put('/api/users/myself', $.param(user), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    });

    promise.success(function() {
      clearUser();
    });

    return promise;
  }

  function checkLoggedInUser() {
    $http.get('/api/users/myself', {ignoreAuthModule: true})
    .success(function(user) {
      setUser(user);
      userDeferred.resolve(user);
    })
    .error(function() {
      userDeferred.resolve({});
    });

    return userDeferred.promise;
  }

  function getUserCount() {
    return $http.get('/api/users/count');
  }

  function getUser(id, options) {
    options = options || {};
    if (options.forceRefresh) {
      delete resolvedUsers[id];
    }

    var parameters = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    var deferred = $q.defer();

    if (resolvedUsers[id]) {
      deferred.resolve(resolvedUsers[id]);
    } else {
      return $http.get('/api/users/' + id, {params: parameters}).success(function(user) {
        resolvedUsers[id] = user;
        deferred.resolve(user);
      });
    }

    return deferred.promise;
  }

  function getAllUsers(options) {
    options = options || {};

    if (options.forceRefresh) {
      resolvedUsers = {};
      resolveAllUsers = true;
    }

    var parameters = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    var deferred = $q.defer();
    if (resolveAllUsers) {
      return $http.get('/api/users', {params: parameters}).success(function(users) {
        deferred.resolve(users);
        resolvedUsers = _.indexBy(users, 'id');
      });
    } else {
      deferred.resolve(_.values(resolvedUsers));
    }

    return deferred.promise;
  }

  function getInactiveUsers() {
    return $http.get('/api/users?active=false');
  }

  function createUser(user, success, error, progress) {
    saveUser(user, {
      url: '/api/users?access_token=' + LocalStorageService.getToken(),
      type: 'POST'
    }, function(user) {
      resolvedUsers[user.id] = user;
      if (_.isFunction(success)) success(user);
    }, error, progress);
  }

  function updateUser(id, user, success, error, progress) {
    saveUser(user, {
      url: '/api/users/' + id + '?access_token=' + LocalStorageService.getToken(),
      type: 'PUT'
    }, function(user) {
      resolvedUsers[user.id] = user;
      if (_.isFunction(success)) success(user);
    }, error, progress);
  }

  function deleteUser(user) {
    return $http.delete('/api/users/' + user.id).success(function(){
      delete resolvedUsers[user.id];
    });
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
    service.amAdmin = service.myself && service.myself.role && (service.myself.role.name === "ADMIN_ROLE");
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
