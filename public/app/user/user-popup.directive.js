angular
  .module('mage')
  .directive('locationPopup', locationPopup);

function locationPopup() {
  var directive = {
    restrict: "A",
    templateUrl:  "app/user/user-popup.directive.html",
    scope: {
      user: '=locationPopup',
      userPopupInfo: '&',
      userZoom: '&'
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
    $scope.userPopupInfo({user: $scope.user});
  }

  $scope.onZoomClicked = function() {
    $scope.userZoom({user: $scope.user});
  }

  $scope.$watch('user', function(user) {
    $scope.date = moment($scope.user.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");
  });
}
