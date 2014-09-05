mage.directive('userLocation', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/user-location.html",
    scope: {
      userLocation: '='
    },
    controller: function ($scope, mageLib) {
      if ($scope.userLocation.avatarUrl) {
        $scope.avatarUrl = $scope.userLocation.avatarUrl + "?access_token=" + mageLib.getToken();
      } else {
        $scope.avatarUrl = "img/missing_photo.png";
      }
    }
  };
});
