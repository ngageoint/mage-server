module.exports = function userNewsItem() {
  var directive = {
    restrict: "A",
    template:  require('./user-feed.directive.html'),
    scope: {
      user: '=userNewsItem',
      followUserId: '=userNewsItemFollow'
    },
    controller: UserNewsItemController
  };

  return directive;
};

UserNewsItemController.$inject = ['$scope', 'LocalStorageService', 'MapService'];

function UserNewsItemController($scope, LocalStorageService, MapService) {
  $scope.followingUser = MapService.followedFeature;

  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "images/missing_photo.png";
  }

  $scope.followUser = function(e, user) {
    e.stopPropagation();
    MapService.followFeatureInLayer(user, 'People')
  };

  $scope.onUserLocationClick = function(user) {
    MapService.zoomToFeatureInLayer(user, 'People');
  };

  $scope.viewUser = function() {
    $scope.onUserLocationClick($scope.user);
    $scope.$emit('user:view', $scope.user);
  }

}
