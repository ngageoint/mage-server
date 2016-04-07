angular
  .module('mage')
  .directive('attachment', attachment);

function attachment() {
  var directive = {
    restrict: "A",
    templateUrl: '/app/observation/observation-attachment.directive.html',
    scope: {
      attachment: '=',
      attachmentObservation: '=',
      edit: '='
    },
    controller: AttachmentController,
    replace: true
  };

  return directive;
}

AttachmentController.$inject = ['$scope', '$filter', 'UserService', 'LocalStorageService'];

function AttachmentController($scope, $filter, UserService, LocalStorageService) {
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = LocalStorageService.getToken();
  $scope.fullscreen = false;

  $scope.videoAPI = null;
  $scope.onPlayerReady = function(videoAPI) {
    $scope.videoAPI = videoAPI;
  };

  $scope.videoCanPlay = function() {
    console.log('video can play');
  };

  $scope.onVideoError = function() {
    $scope.videoError = true;
    console.log('ERROR: video cannot play');
  };

  $scope.$watch('videoAPI.isFullScreen', function(isFullScreen) {
    $scope.fullscreen = isFullScreen;
  });

  $scope.deleteAttachment = function () {
    $scope.attachment.markedForDelete = true;
  };
}
