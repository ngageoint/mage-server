'use strict';

mage.directive('observation', function (appConstants) {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/form/observation.html',
    scope: {
      form: '=',
      observation: '='
    },
    controller: "FeatureController"
  };
});
