var moment = require('moment');

module.exports = function locationPopup() {
  var directive = {
    restrict: "A",
    template: require('./user-popup.directive.html'),
    scope: {
      user: '=locationPopup',
      userPopupInfo: '&',
      userZoom: '&'
    },
    controller: LocationPopupController
  };

  return directive;
};

LocationPopupController.$inject = ['$scope', 'LocalStorageService', 'MapService'];

function LocationPopupController($scope, LocalStorageService, MapService) {
  $scope.followingUser = MapService.followedFeature;
  $scope.date = moment($scope.user.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");

  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "images/missing_photo.png";
  }

  $scope.onInfoClicked = function() {
    $scope.userPopupInfo({user: $scope.user});
  };

  $scope.onZoomClicked = function() {
    $scope.userZoom({user: $scope.user});
  };

  $scope.followUser = function() {
    MapService.followFeatureInLayer($scope.user, 'People')
  }

  $scope.$watch('user', function() {
    $scope.date = moment($scope.user.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");
  });
}
