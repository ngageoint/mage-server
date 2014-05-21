'use strict';

mage.directive('observation', function () {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/form/observation.html',
    scope: {
      form: '=',
      observation: '='
    },
    controller: "FeatureController",
    link: function(scope) {
      // scope.$on('beginEdit', function() {
      //   console.info('begin edit');
      //   scope.observationCopy = angular.copy(scope.observation);
      // });

      scope.save = function() {
        scope.form.getObservation().$save({}, function(observation) {
          scope.form = null;
          angular.copy(observation, scope.observation);
        });
      }

      scope.cancelEdit = function() {
        scope.form = null;
      }
    }
  };
});
