'use strict';

mage.directive('attachment', function () {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/attachment.html',
    scope: {
      observationId: '=',
      attachment: '=',
      edit: '='
    },
    controller: function ($scope, appConstants, mageLib, UserService) {
      $scope.amAdmin = UserService.amAdmin;
      $scope.appConstants = appConstants;
      $scope.token = mageLib.getToken();
    }
  };
});
