// import SetupController from './setup/setup.controller';

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
  .component('setup', require('./setup/setup.controller'))
  .controller('NavController', require('./mage/mage-nav.controller'))
  .controller('NotInEventController', require('./error/not.in.event.controller'))
  .controller('MageController', require('./mage/mage.controller'))
  .controller('AboutController', require('./about/about.controller'))
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

config.$inject = ['$provide', '$httpProvider', '$stateProvider', '$urlRouterProvider', '$animateProvider'];

function config($provide, $httpProvider, $stateProvider, $urlRouterProvider,  $animateProvider) {
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

  $urlRouterProvider.otherwise('/signin');

  $stateProvider.state({
    name: 'landing',
    url: '/signin?action',
    component: 'landing',
    resolve: {
      api: ['$q', 'Api', function($q,  Api) {
        var deferred = $q.defer();
        Api.get(function(api) {
          deferred.resolve(api);
        });

        return deferred.promise;
      }]
    }
  });

  // TODO really think we should redirect to sign?action=signup
  $stateProvider.state({
    name: 'signup',
    url: '/signup',
    component: 'signup',
    resolve: {
      api: ['$q', '$location', 'Api', function($q, $location, Api) {
        var deferred = $q.defer();
        Api.get(function(api) {
          if (api.initial) {
            $location.path('/signin?action=setup');
          } else {
            deferred.resolve(api);
          }
        });

        return deferred.promise;
      }]
    }
  });

  // TODO do we still have an authorize route
  $stateProvider.state({
    name: 'authorize',
    url: '/authorize',
    component: 'authorize'
  });

  $stateProvider.state('admin', {
    redirectTo: 'admin.dashboard',
    url: '/admin',
    component: 'admin'
  });

  $stateProvider.state('admin.dashboard', {
    url: '/dashboard',
    component: 'adminDashboard',
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.users', {
    url: '/users',
    component: 'adminUsers',
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.createUser', {
    url: '/users/new',
    component: 'adminEditUser',
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.bulkUser', {
    url: '/users/bulk',
    component: "adminBulkUser",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.user', {
    url: '/users/:userId',
    component: "adminUser",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.editUser', {
    url: '/users/:userId/edit',
    component: "adminEditUser",
    resolve: resolveAdmin()
  });

  // Admin team routes
  $stateProvider.state('admin.teams', {
    url: '/admin/teams',
    component: "adminTeams",
    resolve: resolveAdmin()
  });

  // $routeProvider.when('/admin/teams/new', {
  //   template: require('./admin/teams/team.edit.html'),
  //   controller: "AdminTeamEditController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/teams/:teamId', {
  //   template: require('./admin/teams/team.html'),
  //   controller: "AdminTeamController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/teams/:teamId/edit', {
  //   template: require('./admin/teams/team.edit.html'),
  //   controller: "AdminTeamEditController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/teams/:teamId/access', {
  //   template: require('./admin/teams/team.access.html'),
  //   controller: "AdminTeamAccessController",
  //   resolve: resolveAdmin()
  // });

  // // Admin event routes
  // $routeProvider.when('/admin/events', {
  //   template: require('./admin/events/events.html'),
  //   controller: "AdminEventsController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/new', {
  //   template: require('./admin/events/event.edit.html'),
  //   controller: "AdminEventEditController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId', {
  //   template: require('./admin/events/event.html'),
  //   controller: "AdminEventController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/edit', {
  //   template: require('./admin/events/event.edit.html'),
  //   controller: "AdminEventEditController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/access', {
  //   template: require('./admin/events/event.access.html'),
  //   controller: "AdminEventAccessController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/forms/new', {
  //   template: require('./admin/events/event.edit.form.html'),
  //   controller: "AdminEventEditFormController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/forms/:formId', {
  //   template: require('./admin/events/event.edit.form.html'),
  //   controller: "AdminEventEditFormController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/forms/:formId/fields', {
  //   template: require('./admin/events/event.edit.form.fields.html'),
  //   controller: "AdminEventEditFormFieldsController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/forms/:formId/map', {
  //   template: require('./admin/events/event.edit.form.map-symbology.html'),
  //   controller: "AdminEventEditFormMapSymbologyController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/events/:eventId/forms/:formId/feed', {
  //   template: require('./admin/events/event.edit.form.feed.html'),
  //   controller: "AdminEventEditFormFeedController",
  //   resolve: resolveAdmin()
  // });

  // // Admin device routes
  // $routeProvider.when('/admin/devices', {
  //   template: require('./admin/devices/devices.html'),
  //   controller: "AdminDevicesController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/devices/new', {
  //   template: require('./admin/devices/device.edit.html'),
  //   controller: "AdminDeviceEditController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/devices/:deviceId', {
  //   template: require('./admin/devices/device.html'),
  //   controller: "AdminDeviceController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/devices/:deviceId/edit', {
  //   template: require('./admin/devices/device.edit.html'),
  //   controller: "AdminDeviceEditController",
  //   resolve: resolveAdmin()
  // });

  // // Admin layer routes
  // $routeProvider.when('/admin/layers', {
  //   template: require('./admin/layers/layers.html'),
  //   controller: "AdminLayersController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/layers/new', {
  //   template: require('./admin/layers/layer.edit.html'),
  //   controller: "AdminLayerEditController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/layers/:layerId', {
  //   template: require('./admin/layers/layer.html'),
  //   controller: "AdminLayerController",
  //   resolve: resolveAdmin()
  // });
  // $routeProvider.when('/admin/layers/:layerId/edit', {
  //   template: require('./admin/layers/layer.edit.html'),
  //   controller: "AdminLayerEditController",
  //   resolve: resolveAdmin()
  // });

  // // Admin settings routes
  // $routeProvider.when('/admin/settings', {
  //   template: require('./admin/settings/settings.html'),
  //   controller: "AdminSettingsController",
  //   resolve: resolveAdmin()
  // });

  // $routeProvider.when('/map', {
  //   template: require('./mage/mage.html'),
  //   controller: "MageController",
  //   resolve: resolveLogin()
  // });

  $stateProvider.state('profile', {
    url: '/profile',
    component: "userProfile",
    resolve: resolveLogin()
  });

  // $routeProvider.when('/user', {
  //   template: require("./user/user.html"),
  //   controller: "UserController",
  //   resolve: resolveLogin()
  // });

  
  // $routeProvider.when('/about', {
  //   template: require("./about/about.html"),
  //   controller: "AboutController",
  //   resolve: resolveLogin()
  // });
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
