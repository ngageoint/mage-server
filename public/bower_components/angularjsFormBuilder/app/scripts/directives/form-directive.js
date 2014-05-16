'use strict';

angular.module('mage').directive('formDirective', function (FormService, ObservationService) {
    return {
        controller: function($scope) {
            ObservationService.newForm().then(function(form) {
              $scope.form = form;
            });

            console.log('gotta form', $scope.form);

            $scope.submit = function() {
                FormService.submitForm($scope.form);
                alert('Form submitted..');
                $scope.form.submitted = true;
            }

            $scope.cancel = function() {
                alert('Form canceled..');
            }
        },
        templateUrl: 'bower_components/angularjsFormBuilder/app/views/directive-templates/form/form.html',
        restrict: 'E',
        scope: {
        }
    };
  });
