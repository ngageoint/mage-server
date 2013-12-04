mage.directive('newsFeed', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    controller: function ($scope, MapService, TimeBucketService) {
      $scope.ms = MapService;
      $scope.timebuckets = TimeBucketService.buckets;
    }
  };
});