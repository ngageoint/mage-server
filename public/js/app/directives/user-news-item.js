angular
  .module('mage')
  .directive('userNewsItem', userNewsItem);

function userNewsItem() {
  var directive = {
    restrict: "A",
    templateUrl:  "js/app/partials/user-news-item.html",
    scope: {
      userNewsItem: '='
    },
    controller: UserNewsItemController,
    bindToController: true
  }

  return directive;
}

UserNewsItemController.$inject = ['$scope', 'UserService', 'LocalStorageService'];

function UserNewsItemController($scope, UserService, LocalStorageService) {
  $scope.location = $scope.userNewsItem.location;
  UserService.getUser($scope.userNewsItem.id).then(function(user) {
    $scope.user = user.data || user;

    if ($scope.user.avatarUrl) {
      $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
    } else {
      $scope.avatarUrl = "img/missing_photo.png";
    }
  });

  $scope.followUser = function(user) {
    $scope.$emit('followUser', user);
  }
}
