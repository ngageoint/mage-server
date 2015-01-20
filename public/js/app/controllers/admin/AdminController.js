'use strict';

function AdminController($scope, $routeParams, $log, $http, $location, $anchorScroll, $injector, $filter, appConstants, UserService, DeviceService, EventService, Event, Layer, mageLib) {
  $scope.currentAdminPanel = $routeParams.adminPanel || "user";

  // Status message values
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';
  $scope.statusLevel = ''; // use the bootstrap alert cl***REMOVED***es for this value, alert-error, alert-success, alert-info. Leave it as '' for yellow

  /*
    Status message functions
    @param {String} statusLevel - bootstrap alert cl***REMOVED***es: alert-error, alert-success, alert-info, or roll your own and add it to the css
  */
  $scope.showStatusMessage = function (title, message, statusLevel) {
    $scope.statusTitle = title;
    $scope.statusMessage = message;
    $scope.statusLevel = statusLevel;
    $scope.showStatus = true;
  }

  $scope.setShowStatus = function (visibility) {
    $scope.showStatus = visibility;
  }

  /* Set the current activity, this will tell the directives which one of them should be visible at the moment. */
  $scope.changeCurrentPanel = function (panel) {
    $scope.currentAdminPanel = panel;
  }
}
