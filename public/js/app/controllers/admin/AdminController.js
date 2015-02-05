'use strict';

angular.module('mage').controller('AdminController', ['$scope', '$routeParams', function ($scope, $routeParams) {
  $scope.currentAdminPanel = $routeParams.adminPanel || "user";

  $scope.$watch('currentAdminPanel', function(panel) {
    console.log('current panel: ' + panel);
  });
  
}]);
