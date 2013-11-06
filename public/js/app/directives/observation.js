'use strict';

mage.directive('observation', function (ObservationService, MapService) {
  return {
    restrict: "A",
    templateUrl: ObservationService.observationTemplate,
    scope: {
      observation:'='
    },
    controller: "FeatureController",
    link: function(scope) {
      scope.os = ObservationService;
      scope.ms = MapService;

      scope.createNewObservation = ObservationService.createNewObservation;
    }
  };
});