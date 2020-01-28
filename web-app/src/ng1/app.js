import _ from 'underscore';
import angular from 'angular';
import mage from './mage/mage.component';
import about from './about/about.component';
import fileUpload from './file-upload/file.upload.component';
import fileBrowser from './file-upload/file.browser.component';
import uiRouter from "@uirouter/angularjs";
import { SwaggerComponent } from "../app/swagger/swagger.component";
import { downgradeComponent } from '@angular/upgrade/static';
import cookies from 'js-cookie';

import {
  MatIcon,
  MatButton,
  MatToolbar,
  MatSpinner,
  MatFormField,
  MatSidenav,
  MatSidenavContent,
  MatSidenavContainer,
} from '@angular/material';

import { ZoomComponent } from '../app/map/controls/zoom.component';
import { SearchComponent } from '../app/map/controls/search.component';
import { LocationComponent } from '../app/map/controls/location.component';
import { AddObservationComponent } from '../app/map/controls/add-observation.component';
import { LeafletComponent } from '../app/map/leaflet.component';

import { ScrollWrapperComponent } from '../app/wrapper/scroll/feed-scroll.component';
import { DropdownComponent } from '../app/observation/edit/dropdown/dropdown.component';
import { MultiSelectDropdownComponent } from '../app/observation/edit/multiselectdropdown/multiselectdropdown.component';

require('angular-minicolors');
require('select2');

const app = angular.module('mage', [
  require('angular-ui-bootstrap'),
  uiRouter,
  require('ui-select'),
  'minicolors',
  require('angular-animate'),
  require('angular-sanitize'),
  require('angular-route'),
  require('angular-resource'),
  require('angular-messages'),
  require('./auth/http-auth-interceptor')
]);

// Downgraded Angular components 
app
  .directive('matIcon', downgradeComponent({ component: MatIcon }))
  .directive('matButton', downgradeComponent({ component: MatButton }))
  .directive('matToolbar', downgradeComponent({ component: MatToolbar }))
  .directive('matSpinner', downgradeComponent({ component: MatSpinner }))
  .directive('matFormField', downgradeComponent({ component: MatFormField }))
  .directive('matSidenav', downgradeComponent({ component: MatSidenav }))
  .directive('matSidenavContent', downgradeComponent({ component: MatSidenavContent }))
  .directive('matSidenavContainer', downgradeComponent({ component: MatSidenavContainer }))
  .directive('feedScrollWrapper', downgradeComponent({ component: ScrollWrapperComponent }))
  .directive('observationEditDropdown', downgradeComponent({ component: DropdownComponent }))
  .directive('observationEditMultiselectdropdown', downgradeComponent({ component: MultiSelectDropdownComponent }))
  .directive('mapLeaflet', downgradeComponent({ component: LeafletComponent }))
  .directive('mapControlZoom', downgradeComponent({ component: ZoomComponent }))
  .directive('mapControlSearch', downgradeComponent({ component: SearchComponent }))
  .directive('mapControlLocation', downgradeComponent({ component: LocationComponent }))
  .directive('mapControlAddObservation', downgradeComponent({ component: AddObservationComponent }));

app
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
  .component('mage', mage)
  .controller('NavController', require('./mage/mage-nav.controller'))
  .controller('NotInEventController', require('./error/not.in.event.controller'))
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

config.$inject = ['$httpProvider', '$stateProvider', '$urlRouterProvider', '$urlServiceProvider', '$animateProvider'];

function config($httpProvider, $stateProvider, $urlRouterProvider, $urlServiceProvider, $animateProvider) {  
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
        const deferred = $q.defer();

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

  // TODO temp place for app states for angular 8
  // this should probably move 
  $stateProvider.state({
    name: 'swagger',
    url: '/swagger',
    component: SwaggerComponent,
    resolve: resolveLogin()
  });

  $stateProvider.state({
    name: 'landing',
    url: '/signin?action?strategy',
    component: 'landing',
    resolve: {
      api: ['$q', 'Api', function($q,  Api) {
        const deferred = $q.defer();
        Api.get(function(api) {
          deferred.resolve(api);
        });

        return deferred.promise;
      }]
    }
  });

  $stateProvider.state('map', {
    url: '/map',
    component: "mage",
    resolve: resolveLogin()
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
    component: 'adminUserEdit',
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.bulkUser', {
    url: '/users/bulk',
    component: "adminUserBulk",
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

  // Admin event routes
  $stateProvider.state('admin.events', {
    url: '/events',
    component: "adminEvents",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.eventCreate', {
    url: '/events/new',
    component: "adminEventEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.event', {
    url: '/events/:eventId',
    component: "adminEvent",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.eventEdit', {
    url: '/events/:eventId/edit',
    component: "adminEventEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.eventAccess', {
    url: '/events/:eventId/access',
    component: "adminEventAccess",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.fieldsCreate', {
    url: '/events/:eventId/forms/new',
    component: "adminEventFormFieldsEdit",
    params: {
      form: null
    },
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.formEdit', {
    url: '/events/:eventId/forms/:formId',
    component: "adminEventFormEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.formFieldsEdit', {
    url: '/events/:eventId/forms/:formId/fields',
    component: "adminEventFormFieldsEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.formMapEdit', {
    url: '/events/:eventId/forms/:formId/map',
    component: "adminEventFormMapEdit",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.formFeedEdit', {
    url: '/events/:eventId/forms/:formId/feed',
    component: "adminEventFormFeedEdit",
    resolve: resolveAdmin()
  });

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

run.$inject = ['$rootScope', '$uibModal', '$templateCache', '$state', 'Api', 'LocalStorageService', 'UserService'];

function run($rootScope, $uibModal, $templateCache, $state, Api, LocalStorageService, UserService) {
  $templateCache.put("observation/observation-important.html", require("./observation/observation-important.html"));

  $rootScope.$on('event:auth-loginRequired', function(e, response) {
    const stateExceptions = ['landing'];
    const requestExceptions = ['/api/users/myself/password'];
    if (!$rootScope.loginDialogPresented && !_(stateExceptions).contains($state.current.name) && !_(requestExceptions).contains(response.config.url)) {
      $rootScope.loginDialogPresented = true;
      Api.get(function(api) {
        let successful = false;
        const options = {
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
        let modalInstance = $uibModal.open(options);
        const modalClosed = function() {
          if (!successful) {
            modalInstance = $uibModal.open(options);
            modalInstance.closed.then(modalClosed);
          }
        };
        modalInstance.closed.then(modalClosed);
        
      });
    }
  });

  trySSO(LocalStorageService, UserService);
}

function trySSO(LocalStorageService, UserService) {
  const ssoTokenCookie = cookies.get('mage-sso-token');

  // if SSO token exists, set it in local storage and fetch current user
  if (ssoTokenCookie) {
    LocalStorageService.setToken(ssoTokenCookie);

    return UserService.getMyself();
  }
}

export default app;
