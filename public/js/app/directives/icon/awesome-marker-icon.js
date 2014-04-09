'use strict';

mage.directive('awesomeMarkerIcon', function (AwesomeMarkerIconService) {
  return {
    restrict: "A",
    template: AwesomeMarkerIconService.template,
    scope: {
    	feature:'=awesomeMarkerIcon',
      types:'='
    },
    controller: function($scope, appConstants) {
    	$scope.$watch('feature.properties.type', function(type) {
        if (!type) return;

        var properties = $scope.feature.properties;
        $scope.markerCl***REMOVED*** = "icon-" + AwesomeMarkerIconService.getCl***REMOVED***(properties.type, {types: $scope.types});
    	});

      $scope.$watch('feature.properties.timestamp', function(timestamp) {
        if (!timestamp) return;
        $scope.markerColor = "awesome-marker-icon-" + appConstants.featureToColor($scope.feature);
      });
    }
  };
});