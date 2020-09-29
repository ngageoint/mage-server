function UserNewsItemController($scope, MapService) {
  $scope.followingUser = MapService.followedFeature;

  $scope.user = $scope.userWithLocation.user;
  $scope.location = $scope.userWithLocation.location

  $scope.followUser = function(e) {
    e.stopPropagation();
    MapService.followFeatureInLayer($scope.user, 'People');
  };

  $scope.onUserLocationClick = function() {
    MapService.zoomToFeatureInLayer($scope.user, 'People');
  };

  $scope.viewUser = function() {
    $scope.onUserLocationClick($scope.user);
    $scope.$emit('user:view', $scope.userWithLocation);
  };
}

module.exports = function userNewsItem() {
  const directive = {
    restrict: "A",
    template: require('./user-feed.directive.html'),
    scope: {
      userWithLocation: '=userNewsItem',
      followUserId: '=userNewsItemFollow'
    },
    controller: UserNewsItemController
  };

  return directive;
};

UserNewsItemController.$inject = ['$scope', 'MapService'];
