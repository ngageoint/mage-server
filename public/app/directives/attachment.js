angular
  .module('mage')
  .directive('attachment', attachment);

function attachment() {
  var directive = {
    restrict: "A",
    templateUrl: '/app/partials/attachment.html',
    scope: {
      attachment: '=',
      attachmentObservation: '=',
      edit: '='
    },
    controller: AttachmentController,
    bindToController: true
  };

  return directive;
}

AttachmentController.$inject = ['$scope', 'UserService', 'LocalStorageService'];

function AttachmentController($scope, UserService, LocalStorageService) {
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = LocalStorageService.getToken();

  $scope.deleteAttachment = function () {
    $scope.attachment.markedForDelete = true;
  }
}
