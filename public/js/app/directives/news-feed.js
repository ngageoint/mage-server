mage.directive('newsFeed', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/news-feed.html",
    controller: function ($scope, MapService, ObservationService, TimeBucketService) {
      $scope.ms = MapService;
      $scope.os = ObservationService;
      $scope.timebuckets = TimeBucketService.buckets;
    }
  };
});
