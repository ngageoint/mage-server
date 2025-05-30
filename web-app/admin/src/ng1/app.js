import _ from 'underscore';
import angular from 'angular';
import fileUpload from './file-upload/file.upload.component';
import fileBrowser from './file-upload/file.browser.component';
import uiRouter from "@uirouter/angularjs";
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';

import { BootstrapComponent } from "../app/bootstrap/bootstrap.component"

import { FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { PluginService } from '../app/plugin/plugin.service'

import { UserAvatarComponent } from '../app/user/user-avatar/user-avatar.component';
import { UserReadService } from '@ngageoint/mage.web-core-lib/user';

import { ContactComponent } from '../app/contact/contact.component';

import { AdminSettingsComponent } from '../app/admin/admin-settings/admin-settings.component';
import { AdminAuthenticationComponent } from '../app/admin/admin-authentication/admin-authentication.component';
import { AdminMapComponent } from '../app/admin/admin-map/admin-map.component';
import { AdminFeedsComponent } from '../app/admin/admin-feeds/admin-feeds.component';
import { AdminFeedComponent } from '../app/admin/admin-feeds/admin-feed/admin-feed.component';
import { AdminServiceComponent } from '../app/admin/admin-feeds/admin-service/admin-service.component'
import { AdminFeedEditComponent } from '../app/admin/admin-feeds/admin-feed/admin-feed-edit/admin-feed-edit.component';
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

app
  .directive('bootstrap', downgradeComponent({ component: BootstrapComponent }));

app
  .factory('FeedService', downgradeInjectable(FeedService))
  .factory('PluginService', downgradeInjectable(PluginService))
  // TODO: remove this once we have a new user service
  .factory('UserReadService', downgradeInjectable(UserReadService))

// Downgraded Angular components
app
  .directive('userAvatar', downgradeComponent({ component: UserAvatarComponent }))
  .directive('feeds', downgradeComponent({ component: AdminFeedsComponent }))
  .directive('adminFeed', downgradeComponent({ component: AdminFeedComponent }))
  .directive('adminService', downgradeComponent({ component: AdminServiceComponent }))
  .directive('feedEdit', downgradeComponent({ component: AdminFeedEditComponent }))
  .directive('upgradedAdminMapSettings', downgradeComponent({ component: AdminMapComponent }))
  .directive('upgradedAdminSettings', downgradeComponent({ component: AdminSettingsComponent }))
  .directive('upgradedAdminAuthentication', downgradeComponent({ component: AdminAuthenticationComponent }))
  .directive('authenticationCreate', downgradeComponent({ component: AuthenticationCreateComponent }))
  .directive('contact', downgradeComponent({ component: ContactComponent }))
  .directive('adminEventFormPreview', downgradeComponent({ component: AdminEventFormPreviewComponent }));

app
  .component('navbar', require('./navbar/navbar.component'))
  .component('dateTime', require('./datetime/datetime.component'))
  .component('fileUpload', fileUpload)
  .component('fileBrowser', fileBrowser)
  .controller('NavController', require('./mage/mage-nav.controller'))
  .directive('fileUploadGrid', require('./file-upload/file-upload-grid.directive'))
  .animation('.slide-down', function () {
    return {
      enter: function (element) {
        element.hide().slideDown();
      },
      leave: function (element) {
        element.slideUp();
      }
    };
  })
  .config(config)
  .run(run);
require('./mage');
require('./authentication') // for modal in admin pages if token expires
require('./factories');
require('./filters');
require('./admin');
require('./user');
require('./material-components');

config.$inject = ['$httpProvider', '$stateProvider', '$urlRouterProvider', '$animateProvider'];

function config($httpProvider, $stateProvider, $urlRouterProvider, $animateProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.post = { 'Content-Type': 'application/x-www-form-urlencoded' };

  $animateProvider.classNameFilter(/ng-animatable/);

  function resolveAdmin() {
    return {
      user: ['$q', 'UserService', function ($q, UserService) {
        const deferred = $q.defer();

        UserService.getMyself().then(function (myself) {
          if (myself == null) {
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

  $urlRouterProvider.otherwise('/home');

  $stateProvider.state('admin', {
    redirectTo: 'admin.dashboard',
    url: '/home',
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

  // Admin feed routes
  $stateProvider.state('admin.feeds', {
    url: '/feeds',
    component: "adminFeeds",
    resolve: resolveAdmin()
  });
  $stateProvider.state('admin.feed', {
    url: '/feeds/:feedId',
    component: "adminFeed",
    resolve: resolveAdmin()
  });
  $stateProvider.state('admin.feedCreate', {
    url: '/feeds/new',
    component: "feedEdit",
    resolve: resolveAdmin()
  });
  $stateProvider.state('admin.feedEdit', {
    url: '/feeds/:feedId/edit',
    component: "feedEdit",
    resolve: resolveAdmin()
  });

  // Admin service routes
  $stateProvider.state('admin.service', {
    url: '/services/:serviceId',
    component: "adminService",
    resolve: resolveAdmin()
  });

  // Admin map routes
  $stateProvider.state('admin.map', {
    url: '/map',
    component: "upgradedAdminMapSettings",
    resolve: resolveAdmin()
  });

  // Security settings routes
  $stateProvider.state('admin.security', {
    url: '/security',
    component: "upgradedAdminAuthentication",
    resolve: resolveAdmin()
  });

  $stateProvider.state('admin.authenticationCreate', {
    url: '/security/new',
    component: "authenticationCreate",
    resolve: resolveAdmin()
  });

  // Admin settings routes
  $stateProvider.state('admin.settings', {
    url: '/settings',
    component: "upgradedAdminSettings",
    resolve: resolveAdmin()
  });
}

run.$inject = ['$rootScope', '$uibModal', '$state', 'Api', 'UserService'];
function run($rootScope, $uibModal, $state, Api, UserService) {

  $rootScope.$on('event:auth-loginRequired', function (e, response) {
    const stateExceptions = ['landing'];
    const requestExceptions = ['/api/users/myself/password'];
    if (!$rootScope.loginDialogPresented && !_(stateExceptions).contains($state.current.name) && !_(requestExceptions).contains(response.config.url)) {
      $rootScope.loginDialogPresented = true;
      Api.get(function (api) {
        let successful = false;
        const options = {
          template: require('./authentication/signin-modal.html'),
          controller: ['$scope', '$uibModalInstance', 'authService', function ($scope, $uibModalInstance, authService) {
            $uibModalInstance.scope = $scope;
            $scope.api = api;
            $scope.hideSignup = true;

            $scope.onSuccess = function () {
              authService.loginConfirmed();
              $rootScope.loginDialogPresented = false;
              successful = true;
              $uibModalInstance.close($scope);
            };

            $scope.logout = function () {
              $rootScope.loginDialogPresented = false;
              successful = true;
              $uibModalInstance.close($scope);
            };
          }]
        };
        let modalInstance = $uibModal.open(options);
        const modalClosed = function () {
          if (!successful) {
            modalInstance = $uibModal.open(options);
            modalInstance.closed.then(modalClosed);
          } else if (!UserService.amAdmin) {
            // Get the hostname and redirect to the home page if user is not admin
            const hostname = window.location.origin;
            window.location.href = `${hostname}/#/home`;
          }
        };
        modalInstance.closed.then(modalClosed);
      });
    }
  });
}

export default app;
