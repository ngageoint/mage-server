/* Fix for IE */
if (!Date.now) { Date.now = function() { return +(new Date); }; }

angular
  .module("mage", [
    "ui.bootstrap",
    "ui.select",
    "minicolors",
    "ngAnimate",
    "ngSanitize",
    "ngRoute",
    "ngResource",
    "ngMessages",
    "http-auth-interceptor",
    "com.2fdevs.videogular",
    "com.2fdevs.videogular.plugins.controls",
    "com.2fdevs.videogular.plugins.overlayplay"
  ]).config(config).run(run);

config.$inject = ['$provide', '$httpProvider', '$routeProvider', '$animateProvider'];

function config($provide, $httpProvider, $routeProvider, $animateProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.post  = {'Content-Type': 'application/x-www-form-urlencoded'};

  $animateProvider.classNameFilter(/ng-animatable/);

  function resolveLogin() {
    return {
      user: ['UserService', function(UserService) {
        return UserService.getMyself();
      }]
    };
  }

  function resolveAdmin() {
    return {
      user: ['$q', 'UserService', function($q, UserService) {
        var deferred = $q.defer();

        UserService.getMyself().then(function(myself) {
          // TODO don't just check for these 2 roles
          myself.role.name === 'ADMIN_ROLE' || myself.role.name === 'EVENT_MANAGER_ROLE' ? deferred.resolve(myself) : deferred.reject();
        });

        return deferred.promise;
      }]
    };
  }

  $routeProvider.otherwise({
    redirectTo: '/'
  });

  $routeProvider.when('/', {
    resolve: {
      api: ['$location', 'Api', function($location, Api) {
        Api.get(function(api) {
          if (api.initial) {
            $location.path('/setup');
          } else {
            $location.path('/signin');
          }
        });
      }]
    }
  });

  $routeProvider.when('/setup', {
    templateUrl: 'app/setup/setup.html',
    controller: 'SetupController',
    resolve: {
      api: ['$q', '$location', 'Api', function($q, $location, Api) {
        var deferred = $q.defer();
        Api.get(function(api) {
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
    templateUrl: 'app/signin/signin.html',
    controller: 'SigninController',
    resolve: {
      api: ['$q', '$location', 'Api', function($q, $location, Api) {
        var deferred = $q.defer();
        Api.get(function(api) {
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
    templateUrl: 'app/signup/signup.html',
    controller: 'SignupController',
    resolve: {
      api: ['$q', '$location', 'Api', function($q, $location, Api) {
        var deferred = $q.defer();
        Api.get(function(api) {
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
    templateUrl: 'app/admin/admin.html',
    controller:  'AdminController',
    resolve: resolveAdmin()
  });

  // Admin user routes
  $routeProvider.when('/admin/users', {
    templateUrl:    'app/admin/users/users.html',
    controller:     "AdminUsersController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/new', {
    templateUrl:    'app/admin/users/user.edit.html',
    controller:     "AdminUserEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/bulk', {
    templateUrl:    'app/admin/users/user.bulk.html',
    controller:     "AdminUserBulkController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/:userId/', {
    templateUrl:    'app/admin/users/user.html',
    controller:     "AdminUserController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/:userId/edit', {
    templateUrl:    'app/admin/users/user.edit.html',
    controller:     "AdminUserEditController",
    resolve: resolveAdmin()
  });

  // Admin team routes
  $routeProvider.when('/admin/teams', {
    templateUrl:    'app/admin/teams/teams.html',
    controller:     "AdminTeamsController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/new', {
    templateUrl:    'app/admin/teams/team.edit.html',
    controller:     "AdminTeamEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/:teamId/', {
    templateUrl:    'app/admin/teams/team.html',
    controller:     "AdminTeamController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/:teamId/edit', {
    templateUrl:    'app/admin/teams/team.edit.html',
    controller:     "AdminTeamEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/:teamId/access', {
    templateUrl:    'app/admin/teams/team.access.html',
    controller:     "AdminTeamAccessController",
    resolve: resolveAdmin()
  });

  // Admin event routes
  $routeProvider.when('/admin/events', {
    templateUrl:    'app/admin/events/events.html',
    controller:     "AdminEventsController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/new', {
    templateUrl:    'app/admin/events/event.edit.html',
    controller:     "AdminEventEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/', {
    templateUrl:    'app/admin/events/event.html',
    controller:     "AdminEventController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/edit', {
    templateUrl:    'app/admin/events/event.edit.html',
    controller:     "AdminEventEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/access', {
    templateUrl:    'app/admin/events/event.access.html',
    controller:     "AdminEventAccessController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/new', {
    templateUrl:    'app/admin/events/event.edit.form.html',
    controller:     "AdminEventEditFormController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/:formId', {
    templateUrl:    'app/admin/events/event.edit.form.html',
    controller:     "AdminEventEditFormController",
    resolve: resolveAdmin()
  });

  // Admin device routes
  $routeProvider.when('/admin/devices', {
    templateUrl:    'app/admin/devices/devices.html',
    controller:     "AdminDevicesController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/devices/new/', {
    templateUrl:    'app/admin/devices/device.edit.html',
    controller:     "AdminDeviceEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/devices/:deviceId/', {
    templateUrl:    'app/admin/devices/device.html',
    controller:     "AdminDeviceController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/devices/:deviceId/edit', {
    templateUrl:    'app/admin/devices/device.edit.html',
    controller:     "AdminDeviceEditController",
    resolve: resolveAdmin()
  });

  // Admin layer routes
  $routeProvider.when('/admin/layers', {
    templateUrl:    'app/admin/layers/layers.html',
    controller:     "AdminLayersController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/layers/new/', {
    templateUrl:    'app/admin/layers/layer.edit.html',
    controller:     "AdminLayerEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/layers/:layerId/', {
    templateUrl:    'app/admin/layers/layer.html',
    controller:     "AdminLayerController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/layers/:layerId/edit', {
    templateUrl:    'app/admin/layers/layer.edit.html',
    controller:     "AdminLayerEditController",
    resolve: resolveAdmin()
  });

  // Admin settings routes
  $routeProvider.when('/admin/settings', {
    templateUrl:    'app/admin/settings/settings.html',
    controller:     "AdminSettingsController",
    resolve: resolveAdmin()
  });

  $routeProvider.when('/debug-info', {
    templateUrl:    'app/debug/debug.html',
    controller:     "DebugController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/map', {
    templateUrl:    'app/mage/mage.html',
    controller:     "MageController",
    resolve: resolveLogin()
  });
  $routeProvider.when('/user', {
    templateUrl:    "app/user/user.html",
    controller:      "UserController",
    resolve: resolveLogin()
  });
  $routeProvider.when('/about', {
    templateUrl:    "/app/about/about.html",
    controller:     "AboutController",
    resolve: resolveLogin()
  });
}

run.$inject = ['$rootScope', '$route', '$uibModal', 'UserService', '$location', 'authService', 'LocalStorageService', 'Api'];

function run($rootScope, $route, $uibModal, UserService, $location, authService, LocalStorageService, Api) {
  $rootScope.$on('event:auth-loginRequired', function() {
    if (!$rootScope.loginDialogPresented && $location.path() !== '/' && $location.path() !== '/signin' && $location.path() !== '/signup' && $location.path() !== '/setup') {
      $rootScope.loginDialogPresented = true;
      var modalInstance = $uibModal.open({
        templateUrl: 'app/signin/signin-modal.html',
        controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
          Api.get(function(api) {
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
              if (data.username !== oldUsername) {
                data.newUser = true;
              }

              $rootScope.loginDialogPresented = false;
              $uibModalInstance.close($scope);
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
          };

          $scope.login = function (data) {
            UserService.login(data).success(function() {
              if (data.username !== oldUsername) {
                data.newUser = true;
              }
              $rootScope.loginDialogPresented = false;
              $uibModalInstance.close($scope);
            }).error(function (data, status) {
              $scope.status = status;
            });
          };

          $scope.cancel = function () {
            $rootScope.loginDialogPresented = false;
            $uibModalInstance.dismiss('cancel');
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

      if ($location.path() === '/signin' || $location.path() === '/setup') {
        $location.path('/map');
      }
    }

    Api.get(function(api) {
      var disclaimer = api.disclaimer || {};
      if (!disclaimer.show) {
        confirmLogin();
        return;
      }

      var modalInstance = $uibModal.open({
        templateUrl: 'app/disclaimer/disclaimer.html',
        controller: 'DisclaimerController',
        resolve: {
          disclaimer: function() {
            return api.disclaimer;
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
