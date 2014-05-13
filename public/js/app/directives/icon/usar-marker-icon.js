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
      $scope.$watch('feature.properties.type', function(type) {
        if (!type) return;

        var properties = $scope.feature.properties;
        $scope.iconSrc = USARMarkerIconService.getIconUrl(properties.type, {types: $scope.types});
    	});
    }
  };
});