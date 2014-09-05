mage.directive('iconUser', function() {
  function iconUrl(user, token) {
    if (user.iconUrl) {
      return user.iconUrl + "?access_token=" + token;
    } else {
      return "img/missing_marker.png";
    }
  }

  return {
    restrict: "A",
    templateUrl: '/js/app/partials/user-icon.html',
    scope: {
      iconUser: '='
    },
    controller: function ($scope, $element, mageLib) {
      $scope.fileName = 'Choose a map icon...';
      $scope.iconUrl = iconUrl($scope.iconUser, mageLib.getToken());

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

        $scope.iconUrl = iconUrl(iconUser, mageLib.getToken());
        $scope.fileName = 'Choose a map icon...';
      });
    }
  }
});
