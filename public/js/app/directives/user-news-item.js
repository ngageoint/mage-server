angular
  .module('mage')
  .directive('userNewsItem', userNewsItem);

function userNewsItem() {
  var directive = {
    restrict: "A",
    templateUrl:  "js/app/partials/user-news-item.html",
    scope: {
      user: '=userNewsItem'
    },
    controller: UserNewsItemController,
    bindToController: true
  }

  return directive;
}

UserNewsItemController.$inject = ['$scope', 'LocalStorageService'];

function UserNewsItemController($scope, LocalStorageService) {
  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "img/missing_photo.png";
  }

  $scope.followUser = function(user) {
    $scope.$emit('followUser', user);
  }
}
