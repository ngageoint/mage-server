'use strict';

mage.directive('awesomeMarkerIcon', function (AwesomeMarkerIconService) {
  return {
    restrict: "A",
    template: AwesomeMarkerIconService.template,
    scope: {
    	feature:'=awesomeMarkerIcon',
      types:'='
    },
    controller: function($scope) {
    	$scope.$watch('feature.attributes.TYPE', function(type) {
        if (!type) return;

        var properties = $scope.feature.properties || $scope.feature.attributes;
        $scope.markerCl***REMOVED*** = "icon-" + AwesomeMarkerIconService.getCl***REMOVED***(properties.TYPE, {types: $scope.types});
    	});

      $scope.$watch('feature.attributes.EVENTDATE', function(timestamp) {
        if (!timestamp) return;

        var properties = $scope.feature.properties || $scope.feature.attributes;
        $scope.markerColor = "awesome-marker-icon-" + AwesomeMarkerIconService.getColor(properties.EVENTDATE);
      });
    }
  };
});