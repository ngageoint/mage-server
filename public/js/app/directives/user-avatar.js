mage.directive('avatarUser', function() {
  function avatarUrl(user, token) {
    if (user && user.avatarUrl) {
      return user.avatarUrl + "?access_token=" + token;
    } else {
      return "img/missing_photo.png";
    }
  }

  return {
    restrict: "A",
    templateUrl: '/js/app/partials/user-avatar.html',
    scope: {
      avatarUser: '='
    },
    controller: function ($scope, $element, mageLib) {
      $scope.fileName = 'Choose an image...';
      $scope.avatarUrl = avatarUrl($scope.avatarUser, mageLib.getToken());

      $element.find(':file').change(function() {
        $scope.file = this.files[0];
        $scope.fileName = $scope.file.name;
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

        $scope.avatarUrl = avatarUrl(avatarUser, mageLib.getToken());
        $scope.fileName = 'Choose an image...';
      });
    }
  }
});
