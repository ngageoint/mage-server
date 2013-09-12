mage.directive('userId', function(UserService, appConstants) {
  return {
    restrict: "A",
    scope: {
    	userId: '='
    },
    controller: function ($scope, UserService) {
        UserService.getUser($scope.userId)
          .then(function(user) {
            $scope.user = user;
          });
    }
  };
});