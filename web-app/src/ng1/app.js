import _ from 'underscore';
import angular from 'angular';
import mage from './mage/mage.component';
import about from './about/about.component';
import fileUpload from './file-upload/file.upload.component';
import fileBrowser from './file-upload/file.browser.component';
import uiRouter from "@uirouter/angularjs";
import { SwaggerComponent } from "../app/swagger/swagger.component";
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';

import {
  MatIcon,
  MatButton,
  MatToolbar,
  MatSpinner,
  MatFormField,
  MatSidenav,
  MatSidenavContent,
  MatSidenavContainer
} from '@angular/material';

import { BootstrapComponent } from "../app/bootstrap/bootstrap.component"

import { ZoomComponent } from '../app/map/controls/zoom.component';
import { SearchComponent } from '../app/map/controls/search.component';
import { LocationComponent } from '../app/map/controls/location.component';
import { AddObservationComponent } from '../app/map/controls/add-observation.component';
import { LeafletComponent } from '../app/map/leaflet.component';
import { ExportComponent } from '../app/export/export.component';
import { AdminSettingsComponent } from '../app/admin/admin-settings/admin-settings.component';

import { ExportService } from '../app/export/export.service'
import { FeedPanelService } from '../app/feed-panel/feed-panel.service'
import { MapPopupService } from '../app/map/map-popup.service'

import { FeedPanelComponent } from '../app/feed-panel/feed-panel.component';

import { ObservationPopupComponent } from '../app/observation/observation-popup/observation-popup.component';
import { ObservationListItemComponent } from '../app/observation/observation-list/observation-list-item.component';

import { UserAvatarComponent } from '../app/user/user-avatar/user-avatar.component';
import { UserPopupComponent } from '../app/user/user-popup/user-popup.component';
import { AuthenticationCreateComponent } from '../app/admin/admin-authentication/admin-authentication-create/admin-authentication-create.component';
import { AdminEventFormPreviewComponent } from '../app/admin/admin-event/admin-event-form/admin-event-form-preview/admin-event-form-preview.component';

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

// Downgraded Angular services 
app
  .factory('ExportService', downgradeInjectable(ExportService))
  .factory('FeedPanelService', downgradeInjectable(FeedPanelService))
  .factory('MapPopupService', downgradeInjectable(MapPopupService));

// Downgraded Angular components 
app
  .directive('bootstrap', downgradeComponent({ component: BootstrapComponent }))
  .directive('matIcon', downgradeComponent({ component: MatIcon }))
  .directive('matButton', downgradeComponent({ component: MatButton }))
  .directive('matToolbar', downgradeComponent({ component: MatToolbar }))
  .directive('matSpinner', downgradeComponent({ component: MatSpinner }))
  .directive('matFormField', downgradeComponent({ component: MatFormField }))
  .directive('matSidenav', downgradeComponent({ component: MatSidenav }))
  .directive('matSidenavContent', downgradeComponent({ component: MatSidenavContent }))
  .directive('matSidenavContainer', downgradeComponent({ component: MatSidenavContainer }))
  .directive('feedPanel', downgradeComponent({ component: FeedPanelComponent }))
  .directive('observationPopup', downgradeComponent({ component: ObservationPopupComponent }))
  .directive('observationListItem', downgradeComponent({ component: ObservationListItemComponent }))
  .directive('userAvatar', downgradeComponent({ component: UserAvatarComponent }))
  .directive('userMapPopup', downgradeComponent({ component: UserPopupComponent }))
  .directive('mapLeaflet', downgradeComponent({ component: LeafletComponent }))
  .directive('mapControlZoom', downgradeComponent({ component: ZoomComponent }))
  .directive('mapControlSearch', downgradeComponent({ component: SearchComponent }))
  .directive('mapControlLocation', downgradeComponent({ component: LocationComponent }))
  .directive('mapControlAddObservation', downgradeComponent({ component: AddObservationComponent }))
  .directive('swagger', downgradeComponent({ component: SwaggerComponent }))
  .directive('export', downgradeComponent({ component: ExportComponent }))
  .directive('upgradedAdminSettings', downgradeComponent({ component: AdminSettingsComponent }))
  .directive('authenticationCreate', downgradeComponent({ component: AuthenticationCreateComponent }))
  .directive('adminEventFormPreview', downgradeComponent({ component: AdminEventFormPreviewComponent }));

app
  .component('filterPanel', require('./filter/filter'))
  .component('eventFilter', require('./filter/event.filter.component'))
  .component('dateTime', require('./datetime/datetime.component'))
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
          if(myself == null){
            deferred.reject();
            return;
          }

          // TODO don't just check for these 2 roles, this should be permission based
          // Important when doing this the admin page also has to be permission based
          // and only show what each user can see.
          // Possible that each role should have an 'admin' permission to abstract this
          myself.role.name === 'ADMIN_ROLE' || myself.role.name === 'EVENT_MANAGER_ROLE' ? deferred.resolve(myself) : deferred.reject();
        });

        return deferred.promise;
      }]
    };
  }

  $urlRouterProvider.otherwise('/signin');

  // TODO temp place for app states for angular 8
  // this should probably move 
  $stateProvider.state({
    name: 'swagger',
    url: '/swagger',
    component: 'swagger',
    resolve: resolveLogin()
  });

  $stateProvider.state({
    name: 'landing',
    url: '/signin?action?strategy?token',
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
    component: "upgradedAdminSettings",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.authenticationCreate', {
    url: '/settings/new',
    component: "authenticationCreate",
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

run.$inject = ['$rootScope', '$uibModal', '$state', 'Api'];

function run($rootScope, $uibModal, $state, Api) {

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
}

export default app;
