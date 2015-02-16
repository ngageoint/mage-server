mage.directive('userId', function() {
  return {
    restrict: "A",
    scope: {
    	userId: '='
    },
    template: '{{user.firstname}} {{user.lastname}}',
    controller: function ($scope, UserService) {
      if (!$scope.userId) return;

      UserService.getUser($scope.userId)
        .then(function(user) {
          $scope.user = user.data || user;
        });
    }
  };
});
