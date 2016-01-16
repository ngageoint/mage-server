/* Fix for IE */
if (!Date.now) { Date.now = function() { return +(new Date); }; }

angular
  .module("mage", [
    "ui.bootstrap",
    "ui.select",
    "minicolors",
    "ngSanitize",
    "ngRoute",
    "ngResource",
    "ngMessages",
    "http-auth-interceptor"
  ]).config(config).run(run);

config.$inject = ['$provide', '$httpProvider', '$routeProvider'];

function config($provide, $httpProvider, $routeProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.post  = {'Content-Type': 'application/x-www-form-urlencoded'};

  function resolveLogin(roles) {
    return {
      user: ['UserService', function(UserService) {
       return UserService.getMyself(roles);
     }]
    }
  }

  $routeProvider.otherwise({
    redirectTo: '/'
  });

  $routeProvider.when('/', {
    resolve: {
      api: ['$location', 'ApiService', function($location, ApiService) {
        ApiService.get(function(api) {
          if (api.initial) {
            $location.path('/setup');
          } else {
            $location.path('/signin')
          }
        });
      }]
    }
  });

  $routeProvider.when('/setup', {
    templateUrl: 'app/setup/setup.html',
    controller: 'SetupController',
    resolve: {
      api: ['$q', '$location', 'ApiService', function($q, $location, ApiService) {
        var deferred = $q.defer();
        ApiService.get(function(api) {
          if (!api.initial) {
            $location.path('/');
          } else {
            deferred.resolve(api);
          }
        });

        return deferred.promise;
      }]
    }
  });

  $routeProvider.when('/signin', {
    templateUrl:    'app/signin/signin.html',
    controller:     "SigninController",
    resolve: {
      api: ['$q', '$location', 'ApiService', function($q, $location, ApiService) {
        var deferred = $q.defer();
        ApiService.get(function(api) {
          if (api.initial) {
            $location.path('/setup');
          } else {
            deferred.resolve(api);
          }
        });

        return deferred.promise;
      }]
    }
  });

  $routeProvider.when('/signup', {
    templateUrl:    'app/signup/signup.html',
    controller:     "SignupController",
    resolve: {
      api: ['$q', '$location', 'ApiService', function($q, $location, ApiService) {
        var deferred = $q.defer();
        ApiService.get(function(api) {
          if (api.initial) {
            $location.path('/setup');
          } else {
            deferred.resolve(api);
          }
        });

        return deferred.promise;
      }]
    }
  });

  $routeProvider.when('/admin', {
    templateUrl:    'app/admin/admin.html',
    controller:     "AdminController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  // Admin user routes
  $routeProvider.when('/admin/users', {
    templateUrl:    'app/admin/users/users.html',
    controller:     "AdminUsersController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/users/new', {
    templateUrl:    'app/admin/users/user.edit.html',
    controller:     "AdminUserEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/users/:userId/', {
    templateUrl:    'app/admin/users/user.html',
    controller:     "AdminUserController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/users/:userId/edit', {
    templateUrl:    'app/admin/users/user.edit.html',
    controller:     "AdminUserEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  // Admin team routes
  $routeProvider.when('/admin/teams', {
    templateUrl:    'app/admin/teams/teams.html',
    controller:     "AdminTeamsController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/teams/new', {
    templateUrl:    'app/admin/teams/team.edit.html',
    controller:     "AdminTeamEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/teams/:teamId/', {
    templateUrl:    'app/admin/teams/team.html',
    controller:     "AdminTeamController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/teams/:teamId/edit', {
    templateUrl:    'app/admin/teams/team.edit.html',
    controller:     "AdminTeamEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  // Admin event routes
  $routeProvider.when('/admin/events', {
    templateUrl:    'app/admin/events/events.html',
    controller:     "AdminEventsController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/events/new', {
    templateUrl:    'app/admin/events/event.edit.html',
    controller:     "AdminEventEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/events/:eventId/', {
    templateUrl:    'app/admin/events/event.html',
    controller:     "AdminEventController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/events/:eventId/edit', {
    templateUrl:    'app/admin/events/event.edit.html',
    controller:     "AdminEventEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/events/:eventId/edit/form', {
    templateUrl:    'app/admin/events/event.edit.form.html',
    controller:     "AdminEventEditFormController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  // Admin device routes
  $routeProvider.when('/admin/devices', {
    templateUrl:    'app/admin/devices/devices.html',
    controller:     "AdminDevicesController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/devices/new/', {
    templateUrl:    'app/admin/devices/device.edit.html',
    controller:     "AdminDeviceEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/devices/:deviceId/', {
    templateUrl:    'app/admin/devices/device.html',
    controller:     "AdminDeviceController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/devices/:deviceId/edit', {
    templateUrl:    'app/admin/devices/device.edit.html',
    controller:     "AdminDeviceEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  // Admin layer routes
  $routeProvider.when('/admin/layers', {
    templateUrl:    'app/admin/layers/layers.html',
    controller:     "AdminLayersController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/layers/new/', {
    templateUrl:    'app/admin/layers/layer.edit.html',
    controller:     "AdminLayerEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/layers/:layerId/', {
    templateUrl:    'app/admin/layers/layer.html',
    controller:     "AdminLayerController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/admin/layers/:layerId/edit', {
    templateUrl:    'app/admin/layers/layer.edit.html',
    controller:     "AdminLayerEditController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  // Admin settings routes
  $routeProvider.when('/admin/settings', {
    templateUrl:    'app/admin/settings/settings.html',
    controller:     "AdminSettingsController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });

  $routeProvider.when('/debug-info', {
    templateUrl:    'app/debug/debug.html',
    controller:     "DebugController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/map', {
    templateUrl:    'app/mage/mage.html',
    controller:     "MageController",
    resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
  });
  $routeProvider.when('/user', {
    templateUrl:    "app/user/user.html",
    controller:      "UserController",
    resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
  });
  $routeProvider.when('/about', {
    templateUrl:    "/app/about/about.html",
    controller:     "AboutController",
    resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
  });
}

run.$inject = ['$rootScope', '$route', '$modal', 'UserService', '$location', 'authService', 'LocalStorageService', 'UserService', 'ApiService'];

function run($rootScope, $route, $modal, UserService, $location, authService, LocalStorageService, UserService, ApiService) {
  var api;
  ApiService.get(function(apiData) {
    api = apiData;
  });

  $rootScope.$on( "$locationChangeStart", function(event, next, current) {
    console.log('locationChangeStart')
    // if (api.initial && next !== '/setup') {
      // event.preventDefault;
    // }
  });


  $rootScope.$on('event:auth-loginRequired', function() {
    if (!$rootScope.loginDialogPresented && $location.path() != '/' && $location.path() != '/signin' && $location.path() != '/signup') {
      $rootScope.loginDialogPresented = true;
      var modalInstance = $modal.open({
        templateUrl: 'app/signin/signin-modal.html',
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          ApiService.get(function(api) {
            function localStrategyFilter(strategy, name) {
              return name === 'local';
            }

            $scope.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, localStrategyFilter), function(strategy, name) {
              strategy.name = name;
              return strategy;
            });

            $scope.localAuthenticationStrategy = api.authenticationStrategies.local;
          });

          var oldUsername = UserService.myself && UserService.myself.username || undefined;

          $scope.googleSignin = function() {
            UserService.oauthSignin('google', {uid: this.uid}).then(function(data) {
              console.log('successfull oauth');
              if (data.username != oldUsername) {
                data.newUser = true;
              }

              $rootScope.loginDialogPresented = false;
              $modalInstance.close($scope);
            }, function(data) {
              $scope.showStatus = true;

              if (data.device && !data.device.registered) {
                $scope.statusTitle = 'Device Pending Registration';
                $scope.statusMessage = data.errorMessage;
                $scope.statusLevel = 'alert-warning';
              } else {
                $scope.statusTitle = 'Error signing in';
                $scope.statusMessage = data.errorMessage;
                $scope.statusLevel = 'alert-danger';
              }
            });
          }

          $scope.login = function (data) {
            UserService.login(data).success(function() {
              if (data.username != oldUsername) {
                data.newUser = true;
              }
              $rootScope.loginDialogPresented = false;
              $modalInstance.close($scope);
            }).error(function (data, status, headers, config) {
              $scope.status = status;
            });
          };

          $scope.cancel = function () {
            $rootScope.loginDialogPresented = false;
            $modalInstance.dismiss('cancel');
          };
        }]
      });

      modalInstance.result.then(function () {
      });
    }

  });

  $rootScope.$on('event:auth-login', function(event, data) {
    function confirmLogin() {
      authService.loginConfirmed(data);

      LocalStorageService.setToken(data.token);
      if ($location.path() == '/signin' || $location.path() == '/setup') {
        $location.path('/map');
      }
    }

    ApiService.get(function(api) {
      var disclaimer = api.disclaimer || {};
      if (!disclaimer.show) {
        confirmLogin();
        return;
      }

      var modalInstance = $modal.open({
        templateUrl: 'app/disclaimer/disclaimer.html',
        controller: 'DisclaimerController',
        resolve: {
          disclaimer: function() {
            return api.disclaimer
          }
        }
      });

      modalInstance.result.then(function () {
        confirmLogin();
      }, function() {
        UserService.logout();
      });
    });
  });
}
