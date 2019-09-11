var _ = require('underscore')
  , angular = require('angular');

/* Fix for IE */
if (!Date.now) { Date.now = function() { return +(new Date); }; }

angular
  .module('mage')
  .component('filterPanel', require('./filter/filter'))
  .component('exportPanel', require('./export/export'))
  .component('eventFilter', require('./filter/event.filter.component'))
  .component('dateTime', require('./datetime/datetime.component'))
  .component('observationFormChooser', require('./observation/observation-form-chooser.component'))
  .component('about', require('./about/about.component'))
  .component('disclaimer', require('./disclaimer/disclaimer.controller'))
  .controller('NavController', require('./mage/mage-nav.controller'))
  .controller('NotInEventController', require('./error/not.in.event.controller'))
  .controller('MageController', require('./mage/mage.controller'))
  // .controller('ExportController', require('./export/export'))
  .controller('SetupController', require('./setup/setup.controller'))
  .controller('UserController', require('./user/user.controller'))
  .controller('AboutController', require('./about/about.controller'))
  // .controller('DisclaimerController', require('./disclaimer/disclaimer.controller'))
  .directive('fileBrowser', require('./file-upload/file-browser.directive'))
  .directive('fileUpload', require('./file-upload/file-upload.directive'))
  .directive('fileUploadGrid', require('./file-upload/file-upload-grid.directive'))
  .animation('.slide-down', function() {
    return {
      enter: function(element) {
        element.hide().slideDown();
      },
      leave: function(element) {
        element.slideUp();
      }
    };
  })
  .config(config)
  .run(run);

require('./factories');
require('./filters');
require('./leaflet-extensions');
require('./mage');
require('./authentication');
require('./observation');
require('./user');
require('./admin');
require('./material-components');

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
          // TODO don't just check for these 2 roles, this should be permission based
          // Important when doing this the admin page also has to be permission based
          // and only show what each user can see.
          // Possible that each role should have an 'admin' permission to abstract this
          myself.role.name === 'ADMIN_ROLE' || myself.role.name === 'EVENT_MANAGER_ROLE' ? deferred.resolve(myself) : deferred.reject();
        });

        return deferred.promise;
      }],
      users: ['UserService', function(UserService) {
        // Pull fresh set of users from server before admin page
        return UserService.getAllUsers({forceRefresh: true, populate: 'roleId'});
      }],
      devices: ['DeviceService', function(DeviceService) {
        // Pull fresh set of users from server before admin page
        return DeviceService.getAllDevices({forceRefresh: true});
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
    template: require('./setup/setup.html'),
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
    template: require('./authentication/authentication.html'),
    controller: 'AuthenticationController',
    controllerAs: '$ctrl',
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
    template: require('./authentication/signup.html'),
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

  $routeProvider.when('/authorize', {
    template: require('./authentication/authorize.html'),
    controller:  'AuthorizeController'
  });

  $routeProvider.when('/admin', {
    template: require('./admin/admin.html'),
    controller:  'AdminController',
    resolve: resolveAdmin()
  });

  // Admin user routes
  $routeProvider.when('/admin/users', {
    template: require('./admin/users/users.html'),
    controller: "AdminUsersController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/new', {
    template: require('./admin/users/user.edit.html'),
    controller: "AdminUserEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/bulk', {
    template: require('./admin/users/user.bulk.html'),
    controller: "AdminUserBulkController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/:userId', {
    template: require('./admin/users/user.html'),
    controller: "AdminUserController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/users/:userId/edit', {
    template: require('./admin/users/user.edit.html'),
    controller: "AdminUserEditController",
    resolve: resolveAdmin()
  });

  // Admin team routes
  $routeProvider.when('/admin/teams', {
    template: require('./admin/teams/teams.html'),
    controller: "AdminTeamsController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/new', {
    template: require('./admin/teams/team.edit.html'),
    controller: "AdminTeamEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/:teamId', {
    template: require('./admin/teams/team.html'),
    controller: "AdminTeamController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/:teamId/edit', {
    template: require('./admin/teams/team.edit.html'),
    controller: "AdminTeamEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/teams/:teamId/access', {
    template: require('./admin/teams/team.access.html'),
    controller: "AdminTeamAccessController",
    resolve: resolveAdmin()
  });

  // Admin event routes
  $routeProvider.when('/admin/events', {
    template: require('./admin/events/events.html'),
    controller: "AdminEventsController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/new', {
    template: require('./admin/events/event.edit.html'),
    controller: "AdminEventEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId', {
    template: require('./admin/events/event.html'),
    controller: "AdminEventController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/edit', {
    template: require('./admin/events/event.edit.html'),
    controller: "AdminEventEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/access', {
    template: require('./admin/events/event.access.html'),
    controller: "AdminEventAccessController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/new', {
    template: require('./admin/events/event.edit.form.html'),
    controller: "AdminEventEditFormController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/:formId', {
    template: require('./admin/events/event.edit.form.html'),
    controller: "AdminEventEditFormController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/:formId/fields', {
    template: require('./admin/events/event.edit.form.fields.html'),
    controller: "AdminEventEditFormFieldsController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/:formId/map', {
    template: require('./admin/events/event.edit.form.map-symbology.html'),
    controller: "AdminEventEditFormMapSymbologyController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/events/:eventId/forms/:formId/feed', {
    template: require('./admin/events/event.edit.form.feed.html'),
    controller: "AdminEventEditFormFeedController",
    resolve: resolveAdmin()
  });

  // Admin device routes
  $routeProvider.when('/admin/devices', {
    template: require('./admin/devices/devices.html'),
    controller: "AdminDevicesController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/devices/new', {
    template: require('./admin/devices/device.edit.html'),
    controller: "AdminDeviceEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/devices/:deviceId', {
    template: require('./admin/devices/device.html'),
    controller: "AdminDeviceController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/devices/:deviceId/edit', {
    template: require('./admin/devices/device.edit.html'),
    controller: "AdminDeviceEditController",
    resolve: resolveAdmin()
  });

  // Admin layer routes
  $routeProvider.when('/admin/layers', {
    template: require('./admin/layers/layers.html'),
    controller: "AdminLayersController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/layers/new', {
    template: require('./admin/layers/layer.edit.html'),
    controller: "AdminLayerEditController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/layers/:layerId', {
    template: require('./admin/layers/layer.html'),
    controller: "AdminLayerController",
    resolve: resolveAdmin()
  });
  $routeProvider.when('/admin/layers/:layerId/edit', {
    template: require('./admin/layers/layer.edit.html'),
    controller: "AdminLayerEditController",
    resolve: resolveAdmin()
  });

  // Admin settings routes
  $routeProvider.when('/admin/settings', {
    template: require('./admin/settings/settings.html'),
    controller: "AdminSettingsController",
    resolve: resolveAdmin()
  });

  $routeProvider.when('/map', {
    template: require('./mage/mage.html'),
    controller: "MageController",
    resolve: resolveLogin()
  });
  $routeProvider.when('/user', {
    template: require("./user/user.html"),
    controller: "UserController",
    resolve: resolveLogin()
  });
  $routeProvider.when('/about', {
    template: require("./about/about.html"),
    controller: "AboutController",
    resolve: resolveLogin()
  });
}

run.$inject = ['$rootScope', '$route', '$uibModal', '$templateCache', 'UserService', '$location', 'authService', 'LocalStorageService', 'Api'];

function run($rootScope, $route, $uibModal, $templateCache, UserService, $location, authService, LocalStorageService, Api) {
  $templateCache.put("observation/observation-important.html", require("./observation/observation-important.html"));

  $rootScope.$on('event:auth-loginRequired', function(e, response) {
    var pathExceptions = ['/', '/signin', '/signup', '/setup', '/authorize'];
    var requestExceptions = ['/api/users/myself/password'];
    if (!$rootScope.loginDialogPresented && !_(pathExceptions).contains($location.path()) && !_(requestExceptions).contains(response.config.url)) {
      $rootScope.loginDialogPresented = true;
      Api.get(function(api) {
        var successful = false;
        var options = {
          template: require('./authentication/signin-modal.html'),
          controller: ['$scope', '$uibModalInstance', 'authService', function ($scope, $uibModalInstance, authService) {
            $uibModalInstance.scope = $scope;
            $scope.api = api;
            $scope.hideSignup = true;

            $scope.onSuccess = function() {
              authService.loginConfirmed();
              $rootScope.loginDialogPresented = false;
              successful = true;
              $uibModalInstance.close($scope);
            };

            $scope.logout = function() {
              $rootScope.loginDialogPresented = false;
              successful = true;
              $uibModalInstance.close($scope);
            };
          }]
        };
        var modalInstance = $uibModal.open(options);
        var modalClosed = function() {
          if (!successful) {
            modalInstance = $uibModal.open(options);
            modalInstance.closed.then(modalClosed);
          }
        };
        modalInstance.closed.then(modalClosed);
        
      });
    }
  });
}
