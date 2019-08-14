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
  $scope.followingUserId = null;

  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "images/missing_photo.png";
  }

  $scope.followUser = function(e, user) {
    e.stopPropagation();
    $scope.$emit('user:follow', user.id === $scope.followUserId ? null : user);
  };

  $scope.onUserLocationClick = function(user) {
    MapService.zoomToFeatureInLayer(user, 'People');
  };

  $scope.viewUser = function() {
    $scope.onUserLocationClick($scope.user);
    $scope.$emit('user:view', $scope.user);
  }

  $scope.$on('user:follow', function(e, user) {
    $scope.followUserId = user ? user.id : null;
  });

}
