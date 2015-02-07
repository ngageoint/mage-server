'use strict';

angular.module('mage').controller('AdminController', ['$scope', '$routeParams',
  function ($scope, $routeParams) {
    $scope.currentAdminPanel = $routeParams.adminPanel || "user";
  }
]);
