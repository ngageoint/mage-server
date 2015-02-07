'use strict';

angular.module('mage').directive('formDirective', function (EventService, Observation, UserService, mageLib) {
    return {
      templateUrl: 'js/app/partials/form/form.html',
      restrict: 'E',
      transclude: true,
      scope: {
        form: '=',
        observation: '=formObservation',
        preview: '=formPreview'
      },
      controller: function($scope) {
        var uploadId = 0;

        $scope.getToken = mageLib.getToken;
        $scope.amAdmin = UserService.amAdmin;
        $scope.attachmentUploads = {};

        function formToObservation(form, observation) {
          _.each(form.fields, function(field) {
            switch (field.name) {
              case 'geometry':
                observation.geometry = {
                  type: 'Point',
                  coordinates: [field.value.x, field.value.y]
                }

                break;
              default:
                observation.properties[field.name] = field.value;
            }
          });
        }

        $scope.save = function() {
          $scope.saving = true;
          var markedForDelete = _.filter($scope.observation.attachments, function(a){ return a.markedForDelete; });
          formToObservation($scope.form, $scope.observation);

          EventService.saveObservation($scope.observation).then(function(updatedObservation) {
            if (_.some(_.values($scope.attachmentUploads), function(v) {return v;})) {
              $scope.uploadAttachments = true;
            } else {
              $scope.form = null;
              $scope.attachmentUploads = {};
            }

            // delete any attachments that were marked for delete
            _.each(markedForDelete, function(attachment) {
              EventService.deleteAttachmentForObservation($scope.observation, attachment);
            });

            if (!$scope.uploadAttachments) {
              $scope.$emit('observationEditDone');
              $scope.saving = false;
            }
          });
        }

        $scope.cancelEdit = function() {
          $scope.$emit('observationEditDone');
        }

        $scope.deleteObservation = function() {
          EventService.archiveObservation($scope.observation).then(function(observation) {
            $scope.$emit('observationEditDone');
          });
        }

        $scope.addAttachment = function() {
          uploadId++;
          $scope.attachmentUploads[uploadId] = false;
        }

        $scope.removeFileUpload = function(id) {
          delete $scope.attachmentUploads[id];
        }

        $scope.filterArchived = function(field) {
          return !field.archived;
        }

        $scope.$on('uploadFile', function(e, id) {
          $scope.attachmentUploads[id] = true;
        });

        $scope.$on('uploadComplete', function(e, url, response, id) {
          EventService.addAttachmentToObservation($scope.observation, response);

          delete $scope.attachmentUploads[id];
          if (_.keys($scope.attachmentUploads).length == 0) {
            $scope.attachmentUploads = {};

            $scope.$emit('observationEditDone');
            $scope.saving = false;
            $scope.uploadAttachments = false;
          }
        });

        // TODO warn user in some way that attachment didn't upload
        $scope.$on('uploadFailed', function(e, url, response, id) {
          delete $scope.attachmentUploads[id];
          if (_.keys($scope.attachmentUploads).length == 0) {
            $scope.attachmentUploads = {};

            $scope.$emit('observationEditDone');
            $scope.saving = false;
          }
        });
      }
    };
  });
