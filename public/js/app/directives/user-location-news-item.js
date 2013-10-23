mage.directive('userLocationNewsItem', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/user-location-news-item.html",
    scope: {
    	location: '=userLocationNewsItem'
    },
    controller: function ($scope, UserService, MapService) {

      $scope.ms = MapService;

    	$scope.locationClick = function(location) {
    		$scope.$emit('locationClick', location);
    	}

      $scope.followUser = function(user) {
        $scope.$emit('followUser', user);
      }
    }
  };
});