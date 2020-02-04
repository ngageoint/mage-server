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

LocationPopupController.$inject = ['$scope', 'MapService'];

function LocationPopupController($scope, MapService) {
  $scope.followingUser = MapService.followedFeature;
  $scope.date = moment($scope.user.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");

  $scope.onInfoClicked = function() {
    $scope.userPopupInfo({user: $scope.user});
  };

  $scope.onZoomClicked = function() {
    $scope.userZoom({user: $scope.user});
  };

  $scope.followUser = function() {
    MapService.followFeatureInLayer($scope.user, 'People');
  };

  $scope.$watch('user', function() {
    $scope.date = moment($scope.user.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");
  });
}
