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
        var uploadId = 0;

        $scope.getToken = mageLib.getToken;
        $scope.amAdmin = UserService.amAdmin;
        $scope.attachmentUploads = {};

        $scope.save = function() {
          $scope.form.getObservation().$save({}, function(observation) {

            if (_.some(_.values($scope.attachmentUploads), function(v) {return v;})) {
              $scope.observationSaved = true;
            } else {
              $scope.form = null;
              $scope.attachmentUploads = {};
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
          uploadId++;
          $scope.attachmentUploads[uploadId] = false;
        }

        $scope.removeFileUpload = function(id) {
          delete $scope.attachmentUploads[id];
        }

        $scope.$on('uploadComplete', function(e, url, response, id) {
          $scope.$emit('newAttachmentSaved', response);

          delete $scope.attachmentUploads[id];
          if (_.keys($scope.attachmentUploads).length == 0) {
            $scope.form = null;
            $scope.observationSaved = false;
            $scope.attachmentUploads = {};
          }
        });

        $scope.$on('uploadFile', function(e, id) {
          $scope.attachmentUploads[id] = true;
        });
      }
    };
  });
