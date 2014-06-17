'use strict';

angular.module('mage').directive('formDirective', function (FormService, ObservationService, UserService) {
    return {
        controller: function($scope) {
            $scope.amAdmin = UserService.amAdmin;

            $scope.save = function() {
              $scope.form.getObservation().$save({}, function(observation) {
                $scope.form = null;
                angular.copy(observation, $scope.formObservation);
                $scope.$emit('newObservationSaved', observation);

                if ($scope.files && $scope.files.length > 0) {
                  $scope.uploadFile(observation);
                }
              });
            }

            $scope.cancelEdit = function() {
              $scope.form = null;
            }
        },
        templateUrl: 'js/app/partials/form/form.html',
        restrict: 'E',
        transclude: true,
        scope: {
          form: '=',
          formObservation: '=',
          formEdit: '='
        }
    };
  });
