'use strict';

mage.directive('observation', function (ObservationService, MapService) {
  return {
    restrict: "A",
    templateUrl: ObservationService.observationTemplate,
    scope: {
      observation: '=',
      form: '='
    },
    controller: "FeatureController",
    link: function(scope) {
      scope.os = ObservationService;
      scope.ms = MapService;

      scope.createNewObservation = ObservationService.createNewObservation;

      scope.$on('beginEdit', function() {
        console.info('begin edit');
        scope.observationCopy = angular.copy(scope.observation);
      });

      scope.cancelEdit = function() {
        scope.observation = angular.copy(scope.observationCopy);
        scope.$emit('cancelEdit', scope.observation);
      }

      scope.$watch('form', function(form) {
        console.log('yeah buddy form changed', form);
      });
    }
  };
});
