'use strict';

angular.module('mage').directive('formDirective', function (FormService, ObservationService, UserService, FeatureAttachment, appConstants, mageLib) {
    return {
      templateUrl: 'js/app/partials/form/form.html',
      restrict: 'E',
      transclude: true,
      scope: {
        form: '=',
        formObservation: '=',
        formEdit: '='
      },
      controller: function($scope) {
          var attachmentsUploaded = 0;

          $scope.getToken = mageLib.getToken;
          $scope.amAdmin = UserService.amAdmin;
          $scope.attachmentUploads = [];

          $scope.save = function() {
            $scope.form.getObservation().$save({}, function(observation) {

              if ($scope.attachmentUploads.length > 0) {
                $scope.observationSaved = true;
              } else {
                $scope.form = null;
              }

              // delete any attachments that are marked for delete
              var markedForDelete = _.filter($scope.formObservation.attachments, function(a){ return a.markedForDelete; });
              _.each(markedForDelete, function(attachment) {
                var data = {id: attachment.id, layerId: appConstants.featureLayer.id, featureId: $scope.formObservation.id};
                FeatureAttachment.delete(data, function(success) {
                  $scope.$emit('attachmentDeleted', attachment);
                });
              });

              $scope.$emit('newObservationSaved', observation);
            });
          }

          $scope.cancelEdit = function() {
            $scope.form = null;
            $scope.attachmentUploads = [];
            _.each($scope.formObservation.attachments, function(attachment) {
              delete attachment.markedForDelete;
            });
          }

          $scope.addAttachment = function() {
            $scope.attachmentUploads.push({});
          }

          $scope.$on('uploadComplete', function(e, url, response) {
            $scope.$emit('newAttachmentSaved', response);

            attachmentsUploaded++;
            if (attachmentsUploaded == $scope.attachmentUploads.length) {
              $scope.form = null;
              $scope.observationSaved = false;
              $scope.attachmentUploads = [];
              attachmentsUploaded = 0;
            }
          });
      }
    };
  });
