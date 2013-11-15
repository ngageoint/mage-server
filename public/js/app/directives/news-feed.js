mage.directive('newsFeed', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    controller: function ($scope, MapService) {
      $scope.ms = MapService;
    }
  };
});