'use strict';

mage.directive('markerIcon', function (IconService, FeatureTypeService) {
  return {
    restrict: "A",
    template: IconService.markerTemplate,
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

mage.directive('plainIcon', function (IconService, FeatureTypeService) {
  return {
    restrict: "A",
    template: IconService.iconTemplate,
    scope: {
      feature:'=plainIcon'
    },
    controller: function($scope) {
      $scope.$watchCollection('feature.properties', function() {
        IconService.setTemplateVariables($scope.feature, $scope);
      });
    }
  };
});
