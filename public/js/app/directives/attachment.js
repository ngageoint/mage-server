'use strict';

mage.directive('attachment', function () {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/attachment.html',
    scope: {
      attachment: '=',
      attachmentObservation: '=',
      edit: '='
    },
    controller: function ($scope, appConstants, mageLib, UserService, FeatureAttachment) {
      $scope.amAdmin = UserService.amAdmin;
      $scope.appConstants = appConstants;
      $scope.token = mageLib.getToken();

      $scope.deleteAttachment = function () {
        $scope.attachment.markedForDelete = true;
      }
    }
  };
});
