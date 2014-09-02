mage.directive('avatarUser', function() {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/user-avatar.html',
    scope: {
      avatarUser: '=',
      url: '@',
      uploadId: '=',
      uploadFileFormName: '=',
    },
    controller: function ($scope, $element, mageLib) {
      $scope.avatarUrl = $scope.avatarUser.avatarUrl + "?access_token=" + mageLib.getToken() || "img/missing_photo.png";

      $element.find('.file-custom').attr('data-filename', 'Choose an image...');

      $element.find(':file').change(function() {
        $scope.file = this.files[0];
        $scope.$emit('userAvatar', $scope.file);

        if (window.FileReader) {
          var reader = new FileReader();
          reader.onload = (function(file) {
            return function(e) {
              $scope.$apply(function() {
                $scope.avatarUrl = e.target.result;
              });
            };
          })($scope.file);

          reader.readAsDataURL($scope.file);
        }
      });

      $scope.$watch('avatarUser', function(avatarUser) {
        if (!avatarUser) return;

        $scope.avatarUrl = $scope.avatarUser.avatarUrl + "?access_token=" + mageLib.getToken() || "img/missing_photo.png";
        $element.find('.file-custom').attr('data-filename', 'Choose an image...');
      });
    }
  }
});
