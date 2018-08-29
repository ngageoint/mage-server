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

UserNewsItemController.$inject = ['$scope', 'LocalStorageService'];

function UserNewsItemController($scope, LocalStorageService) {
  $scope.followingUserId = null;

  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "images/missing_photo.png";
  }

  $scope.followUser = function(e, user) {
    e.stopPropagation();
    $scope.$emit('user:follow', user);
  };

  $scope.onUserLocationClick = function(user) {
    $scope.$emit('user:zoom', user, {panToLocation: true, zoomToLocation: true});
  };

}
