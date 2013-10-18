mage.directive('observationNewsItem', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
    	observation: '=observationNewsItem'
    },
    controller: function ($scope, IconService, $sce, mageLib) {
    	$scope.iconTag = $sce.trustAsHtml(IconService.iconHtml($scope.observation, $scope));
      $scope.attachmentUrl = '/FeatureServer/2/features/';
      $scope.token = mageLib.getLocalItem('token');
      $scope.setActiveObservation = function(observation) {
        $scope.$emit('observationClick', observation);
      }
    }
  };
});