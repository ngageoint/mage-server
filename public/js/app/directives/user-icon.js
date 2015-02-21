angular
  .module('mage')
  .directive('iconUser', iconUser);

function iconUser() {
  var directive = {
    restrict: "A",
    templateUrl: '/js/app/partials/user-icon.html',
    scope: {
      iconUser: '='
    },
    controller: IconUserController,
    bindToController: true
  }

  return directive;
}

IconUserController.$inject = ['$scope', '$element', 'TokenService'];

function IconUserController($scope, $element, TokenService) {
  $scope.fileName = 'Choose a map icon...';
  $scope.iconUrl = iconUrl($scope.iconUser, TokenService.getToken());

  $element.find(':file').change(function() {
    $scope.file = this.files[0];
    $scope.fileName = $scope.file.name;
    $scope.$emit('userIcon', $scope.file);

    if (window.FileReader) {
      var reader = new FileReader();
      reader.onload = (function(file) {
        return function(e) {
          $scope.$apply(function() {
            $scope.iconUrl = e.target.result;
          });
        };
      })($scope.file);

      reader.readAsDataURL($scope.file);
    }
  });

  $scope.$watch('iconUser', function(iconUser) {
    if (!iconUser) return;

    $scope.iconUrl = iconUrl(iconUser, TokenService.getToken());
    $scope.fileName = 'Choose a map icon...';
  });

  function iconUrl(user, token) {
    if (user && user.iconUrl) {
      return user.iconUrl + "?access_token=" + token;
    } else {
      return "img/missing_marker.png";
    }
  }
}
