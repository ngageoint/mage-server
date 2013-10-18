mage.directive('userLocationNewsItem', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/user-location-news-item.html",
    scope: {
    	location: '=userLocationNewsItem'
    },
    controller: function ($scope, UserService) {

    	$scope.locationClick = function(location) {
    		$scope.$emit('locationClick', location);
    	}

      // $scope.getUser = function(userId) {
      //   var u = UserService.getUser(userId);
      //   if (u.success) {
      //     u.success(function(user) {
      //       $scope.user = user;
      //     })
      //     .error(function() {
      //       console.log('error trying to get user');
      //     });
      //   } else if (u.then) {
      //     u.then(function(user) {
      //       $scope.user = user;
      //     })
      //   }
        
      // }
    }
  };
});