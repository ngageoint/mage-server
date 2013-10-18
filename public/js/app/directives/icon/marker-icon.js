'use strict';

mage.directive('markerIcon', function (IconService, FeatureTypeService) {
  return {
    restrict: "A",
    template: IconService.template,
    scope: {
    	feature:'=markerIcon'
    },
    controller: function($scope) {
      $scope.$watchCollection('feature.properties', function() {
        IconService.setTemplateVariables($scope.feature, $scope);
      });
    }
  };
});
