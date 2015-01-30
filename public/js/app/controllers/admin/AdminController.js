'use strict';

function AdminController($scope, $routeParams, $log, $http, $location, $anchorScroll, $injector, $filter, appConstants, UserService, DeviceService, EventService, Event, Layer, mageLib) {
  $scope.currentAdminPanel = $routeParams.adminPanel || "user";

  $scope.$watch('currentAdminPanel', function(panel) {
    console.log('current panel: ' + panel);
  })
}
