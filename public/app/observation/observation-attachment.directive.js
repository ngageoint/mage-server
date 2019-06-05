module.exports = function attachment() {
  var directive = {
    restrict: "A",
    template: require('./observation-attachment.directive.html'),
    scope: {
      attachment: '=',
      attachmentObservation: '=',
      edit: '='
    },
    controller: AttachmentController,
    replace: true
  };

  return directive;
};

AttachmentController.$inject = ['$scope', '$filter', 'UserService', 'LocalStorageService'];

function AttachmentController($scope, $filter, UserService, LocalStorageService) {
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = LocalStorageService.getToken();

  $scope.deleteAttachment = function () {
    $scope.attachment.markedForDelete = true;
  };
}
