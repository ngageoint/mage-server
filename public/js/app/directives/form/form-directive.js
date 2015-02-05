'use strict';

angular.module('mage').directive('formDirective', function (EventService, Observation, ObservationService, UserService, ObservationAttachment, appConstants, mageLib, ObservationState) {
    return {
      templateUrl: 'js/app/partials/form/form.html',
      restrict: 'E',
      transclude: true,
      scope: {
        form: '=',
        observation: '=formObservation'
      },
      controller: function($scope) {
        var uploadId = 0;

        $scope.getToken = mageLib.getToken;
        $scope.amAdmin = UserService.amAdmin;
        $scope.attachmentUploads = {};

        function formToObservation(form, observation) {
          var newObservation = new Observation({
            id: observation.id,
            eventId: observation.eventId,
            type: 'Feature',
            properties: {
            }
          });

          _.each(form.fields, function(field) {
            switch (field.name) {
              case 'geometry':
                newObservation.geometry = {
                  type: 'Point',
                  coordinates: [field.value.x, field.value.y]
                }

                break;
              default:
                newObservation.properties[field.name] = field.value;
            }
          });

          return newObservation;
        }

        $scope.save = function() {
          var observation = formToObservation($scope.form, $scope.observation);

          EventService.saveObservation(observation).then(function(observation) {
            if (_.some(_.values($scope.attachmentUploads), function(v) {return v;})) {
              $scope.observationSaved = true;
            } else {
              $scope.form = null;
              $scope.attachmentUploads = {};
            }

            // delete any attachments that are marked for delete
            var markedForDelete = _.filter($scope.observation.attachments, function(a){ return a.markedForDelete; });
            _.each(markedForDelete, function(attachment) {
              var data = {id: attachment.id, layerId: appConstants.featureLayer.id, featureId: $scope.observation.id};
              FeatureAttachment.delete(data, function(success) {
                $scope.$emit('attachmentDeleted', attachment);
              });
            });

            $scope.observation = observation;
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

        $scope.deleteObservation = function() {
          var observation = $scope.form.getObservation();

          console.log('making call to archive observation');
          FeatureState.save(
            {layerId: observation.layerId, featureId: observation.id},
            {name: 'archive'},
            function(state) {
              $scope.form = null;
              // $scope.deletedFeature = $scope.activeFeature;
              observation.state = state;
              $scope.$emit('observationDeleted', observation);
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

        $scope.$on('uploadComplete', function(e, url, response, id) {
          $scope.$emit('newAttachmentSaved', response, $scope.observation.id);

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
