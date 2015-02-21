// TODO possible rename, what does this directive really do???
angular
  .module('mage')
  .directive('userLocation', userLocation);

function userLocation() {
  var directive = {
    restrict: "A",
    templateUrl:  "js/app/partials/user-location.html",
    scope: {
      userLocation: '='
    },
    controller: UserLocationController,
    bindToController: true
  }

  return directive;
}

UserLocationController.$inject = ['$scope', 'TokenService'];

function UserLocationController($scope, TokenService) {
  if ($scope.userLocation.avatarUrl) {
    $scope.avatarUrl = $scope.userLocation.avatarUrl + "?access_token=" + TokenService.getToken();
  } else {
    $scope.avatarUrl = "img/missing_photo.png";
  }
}
