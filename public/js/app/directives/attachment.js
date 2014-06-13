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

      $scope.deleteAttachment = function (observation, attachmentId) {
        FeatureAttachment.delete({id: $scope.attachment.id, layerId: appConstants.featureLayer.id, featureId: $scope.attachmentObservation.id}, function(success) {
          $scope.attachmentObservation.attachments = _.filter($scope.attachmentObservation.attachments, function(attachment) {return attachment.id != $scope.attachment.id});
        });
      }
    }
  };
});
