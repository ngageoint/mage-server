'use strict';

angular.module('mage').directive('formDirective', function (FormService) {
    return {
        controller: function($scope){
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
            form:'='
        }
    };
  });
