mage.directive('userId', function(UserService, appConstants) {
  return {
    restrict: "A",
    scope: {
    	userId: '='
    },
    controller: function ($scope, UserService) {
      $scope.$watch("userId", function(userId) {
        if (!userId) return;

        UserService.getUser($scope.userId)
          .then(function(user) {
            $scope.user = user.data || user;
          });
        }
      );
    }
  };
});