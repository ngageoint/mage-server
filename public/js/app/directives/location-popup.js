angular
  .module('mage')
  .directive('locationPopup', locationPopup);

function locationPopup() {
  var directive = {
    restrict: "A",
    templateUrl:  "js/app/partials/location-popup.html",
    scope: {
      user: '=locationPopup',
      userInfo: '&userPopupInfo'
    },
    controller: LocationPopupController,
    bindToController: true
  }

  return directive;
}

LocationPopupController.$inject = ['$scope', 'LocalStorageService'];

function LocationPopupController($scope, LocalStorageService) {
  $scope.date = moment($scope.user.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");

  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "img/missing_photo.png";
  }

  $scope.onInfoClicked = function() {
    $scope.userInfo({user: $scope.user});
  }
}
