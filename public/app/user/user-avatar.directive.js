angular
  .module('mage')
  .directive('avatarUser', avatarUser);

function avatarUser() {
  var directive = {
    restrict: "A",
    templateUrl: '/app/user/user-avatar.directive.html',
    scope: {
      avatarUser: '='
    },
    controller: AvatarUserController,
    bindToController: true
  }

  return directive;
}

AvatarUserController.$inject = ['$scope', '$element', 'LocalStorageService'];

function AvatarUserController($scope, $element, LocalStorageService) {
  $scope.fileName = 'Choose an avatar image...';
  $scope.avatarUrl = avatarUrl($scope.avatarUser, LocalStorageService.getToken());

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

    $scope.avatarUrl = avatarUrl(avatarUser, LocalStorageService.getToken());
    $scope.fileName = 'Choose an image...';
  });

  function avatarUrl(user, token) {
    if (user && user.avatarUrl) {
      return user.avatarUrl + "?access_token=" + token;
    } else {
      return "img/missing_photo.png";
    }
  }
}
