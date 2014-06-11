'use strict';

mage.directive('observation', function (appConstants) {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/form/observation.html',
    scope: {
      form: '=',
      observation: '='
    },
    controller: "FeatureController",
    link: function(scope) {
      scope.save = function() {
        scope.form.getObservation().$save({}, function(observation) {
          scope.form = null;
          angular.copy(observation, scope.observation);

          if (scope.files && scope.files.length > 0) {
            scope.fileUploadUrl ='/FeatureServer/' + appConstants.featureLayerId + '/features/' + observation.id + '/attachments';
            scope.uploadFile(observation);
          }
        });
      }

      scope.cancelEdit = function() {
        scope.form = null;
      }
    }
  };
});
