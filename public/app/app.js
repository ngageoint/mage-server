import _ from 'underscore';
import angular from 'angular';
import about from './about/about.component';
import fileUpload from './file-upload/file.upload.component';
import fileBrowser from './file-upload/file.browser.component';

/* Fix for IE */
if (!Date.now) { Date.now = function() { return +(new Date); }; }

angular
  .module('mage')
  .component('filterPanel', require('./filter/filter'))
  .component('exportPanel', require('./export/export'))
  .component('eventFilter', require('./filter/event.filter.component'))
  .component('dateTime', require('./datetime/datetime.component'))
  .component('observationFormChooser', require('./observation/observation-form-chooser.component'))
  .component('disclaimer', require('./disclaimer/disclaimer.controller'))
  .component('setup', require('./setup/setup.controller'))
  .component('about', about)
  .component('fileUpload', fileUpload)
  .component('fileBrowser', fileBrowser)
  .controller('NavController', require('./mage/mage-nav.controller'))
  .controller('NotInEventController', require('./error/not.in.event.controller'))
  .controller('MageController', require('./mage/mage.controller'))
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

  // $routeProvider.when('/map', {
  //   template: require('./mage/mage.html'),
  //   controller: "MageController",
  //   resolve: resolveLogin()
  // });

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
    component: 'adminUserEdit',
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
    component: "adminUserEdit",
    resolve: resolveAdmin()
  });

  // Admin team routes
  $stateProvider.state('admin.teams', {
    url: '/teams',
    component: "adminTeams",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.createTeam', {
    url: '/teams/new',
    component: "adminTeamEdit",
    resolve: resolveAdmin()
  });
  
  $stateProvider.state('admin.team', {
    url: '/teams/:teamId',
    component: "adminTeam",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.editTeam', {
    url: '/teams/:teamId/edit',
    component: "adminTeamEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.teamAccess', {
    url: '/teams/:teamId/access',
    component: "adminTeamAccess",
    resolve: resolveAdmin()
  });

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

  // Admin device routes
  $stateProvider.state('admin.devices', {
    url: '/devices',
    component: "adminDevices",
    resolve: resolveAdmin()
  });
  
  $stateProvider.state('admin.deviceCreate', {
    url: '/devices/new',
    component: "adminDeviceEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.device', {
    url: '/devices/:deviceId',
    component: "adminDevice",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.deviceEdit', {
    url: '/devices/:deviceId/edit',
    component: "adminDeviceEdit",
    resolve: resolveAdmin()
  });

  // Admin layer routes
  $stateProvider.state('admin.layers', {
    url: '/layers',
    component: "adminLayers",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.layerCreate', {
    url: '/layers/new',
    component: "adminLayerEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.layer', {
    url: '/layers/:layerId',
    component: "adminLayer",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.layerEdit', {
    url: '/layers/:layerId/edit',
    component: "adminLayerEdit",
    resolve: resolveAdmin()
  });

  // Admin settings routes
  $stateProvider.state('admin.settings', {
    url: '/settings',
    component: "adminSettings",
    resolve: resolveAdmin()
  });

  $stateProvider.state('profile', {
    url: '/profile',
    component: "userProfile",
    resolve: resolveLogin()
  });

  $stateProvider.state('about', {
    url: '/about',
    component: "about",
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
