module.exports = function attachment() {
  var directive = {
    restrict: "A",
    template: require('./observation-attachment-nolink.directive.html'),
    scope: {
      attachment: '=attachmentNoLink',
      attachmentObservation: '=',
      edit: '=',
      label: '=',
      disableClick: '='
    },
    controller: AttachmentController,
    replace: true
  };

  return directive;
};

AttachmentController.$inject = ['$scope', 'UserService', 'LocalStorageService'];

function AttachmentController($scope, UserService, LocalStorageService) {
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = LocalStorageService.getToken();

  $scope.deleteAttachment = function () {
    $scope.attachment.markedForDelete = true;
  };
}
