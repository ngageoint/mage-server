'use strict';

mage.directive('***REMOVED***MarkerIcon', function (USARMarkerIconService) {
  return {
    restrict: "A",
    template: USARMarkerIconService.template,
    scope: {
    	feature:'=***REMOVED***MarkerIcon',
      types:'='
    },
    controller: function($scope) {
      $scope.$watch('feature.attributes.TYPE + feature.properties.TYPE', function(type) {
        if (!type) return;

        var properties = $scope.feature.properties || $scope.feature.attributes;
        $scope.iconSrc = USARMarkerIconService.getIconUrl(properties.TYPE, {types: $scope.types});
    	});
    }
  };
});