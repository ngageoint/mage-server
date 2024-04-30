import _ from 'underscore';
import angular from 'angular';
import mage from './mage/mage.component';
import about from './about/about.component';
import fileUpload from './file-upload/file.upload.component';
import fileBrowser from './file-upload/file.browser.component';
import uiRouter from "@uirouter/angularjs";
import { SwaggerComponent } from "../app/swagger/swagger.component";
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';

import { BootstrapComponent } from "../app/bootstrap/bootstrap.component"

import { ZoomComponent } from '../app/map/controls/zoom.component';
import { SearchComponent } from '../app/map/controls/search.component';
import { LocationComponent } from '../app/map/controls/location.component';
import { AddObservationComponent } from '../app/map/controls/add-observation.component';
import { LeafletComponent } from '../app/map/leaflet.component';
import { ExportComponent } from '../app/export/export.component';

import { FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { ExportService } from '../app/export/export.service'
import { FeedPanelService } from '../app/feed-panel/feed-panel.service'
import { MapPopupService } from '../app/map/map-popup.service'
import { PluginService } from '../app/plugin/plugin.service'

import { FeedPanelComponent } from '../app/feed-panel/feed-panel.component';
import { FeedItemMapPopupComponent } from '../app/feed/feed-item/feed-item-map/feed-item-map-popup.component'

import { ObservationPopupComponent } from '../app/observation/observation-popup/observation-popup.component';
import { ObservationListItemComponent } from '../app/observation/observation-list/observation-list-item.component';

import { UserAvatarComponent } from '../app/user/user-avatar/user-avatar.component';
import { UserPopupComponent } from '../app/user/user-popup/user-popup.component';
import { UserReadService } from '@ngageoint/mage.web-core-lib/user';

import { ContactComponent } from '../app/contact/contact.component';

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
  .factory('ExportService', downgradeInjectable(ExportService))
  .factory('FeedPanelService', downgradeInjectable(FeedPanelService))
  .factory('MapPopupService', downgradeInjectable(MapPopupService))
  .factory('PluginService', downgradeInjectable(PluginService))
  // TODO: remove this once we have a new user service
  .factory('UserReadService', downgradeInjectable(UserReadService))

// Downgraded Angular components
app
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
  .directive('feedItemMapPopup', downgradeComponent({ component: FeedItemMapPopupComponent }))
  .directive('swagger', downgradeComponent({ component: SwaggerComponent }))
  .directive('export', downgradeComponent({ component: ExportComponent }))
  .directive('contact', downgradeComponent({ component: ContactComponent }))

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
require('./material-components');

config.$inject = ['$httpProvider', '$stateProvider', '$urlRouterProvider', '$animateProvider'];

function config($httpProvider, $stateProvider, $urlRouterProvider, $animateProvider) {
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
