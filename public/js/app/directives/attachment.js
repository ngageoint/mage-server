angular
  .module('mage')
  .directive('attachment', attachment);

function attachment() {
  var directive = {
    restrict: "A",
    templateUrl: '/js/app/partials/attachment.html',
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

AttachmentController.$inject = ['$scope', 'UserService', 'TokenService'];

function AttachmentController($scope, UserService, TokenService) {
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = TokenService.getToken();

  $scope.deleteAttachment = function () {
    $scope.attachment.markedForDelete = true;
  }
}
