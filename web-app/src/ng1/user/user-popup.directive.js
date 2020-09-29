const moment = require('moment');

function LocationPopupController($scope, MapService) {
  $scope.user = $scope.userWithLocation.user;
  $scope.location = $scope.userWithLocation.location;
  $scope.followingUser = MapService.followedFeature;
  $scope.date = moment($scope.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");

  $scope.onInfoClicked = function() {
    $scope.userPopupInfo({user: $scope.userWithLocation});
  };

  $scope.onZoomClicked = function() {
    $scope.userZoom({user: $scope.user});
  };

  $scope.followUser = function() {
    MapService.followFeatureInLayer($scope.user, 'People');
  };

  $scope.$watch('user', function() {
    $scope.date = moment($scope.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");
  });
}

LocationPopupController.$inject = ['$scope', 'MapService'];

module.exports = function locationPopup() {
  const directive = {
    restrict: "A",
    template: require('./user-popup.directive.html'),
    scope: {
      userWithLocation: '=locationPopup',
      userPopupInfo: '&',
      userZoom: '&'
    },
    controller: LocationPopupController
  };

  return directive;
};
