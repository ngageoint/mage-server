'use strict';

angular.module('mage').directive('formDirective', function (FormService, ObservationService, UserService, mageLib) {
    return {
        controller: function($scope) {
            console.log('form observation', $scope.formObservation);
            $scope.getToken = mageLib.getToken;
            $scope.amAdmin = UserService.amAdmin;
            $scope.attachmentUploads = [];

            $scope.save = function() {
              $scope.form.getObservation().$save({}, function(observation) {
                $scope.form = null;
                angular.copy(observation, $scope.formObservation);
                $scope.$emit('newObservationSaved', observation);
                $scope.observationSaved = true;
                // TODO upload all attachments
                // if ($scope.files && $scope.files.length > 0) {
                //   $scope.uploadFile(observation);
                // }
              });
            }

            $scope.cancelEdit = function() {
              $scope.form = null;
              $scope.attachmentUploads = [];
            }

            $scope.addAttachment = function() {
              $scope.attachmentUploads.push({});
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
