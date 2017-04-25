angular
  .module('mage')
  .directive('formDirective', formDirective);

function formDirective() {
  var directive = {
    templateUrl: 'app/observation/form/form.directive.html',
    restrict: 'E',
    transclude: true,
    scope: {
      form: '=',
      observation: '=formObservation',
      preview: '=formPreview'
    },
    controller: FormDirectiveController
  };

  return directive;
}

FormDirectiveController.$inject = ['$scope', 'EventService', 'Observation', 'ObservationService', 'UserService', 'LocalStorageService'];

function FormDirectiveController($scope, EventService, Observation, ObservationService, UserService, LocalStorageService) {
  var uploadId = 0;

  if ($scope.observation) {
    $scope.event = EventService.getEventById($scope.observation.eventId);
    var geometryField = EventService.getFormField($scope.form, 'geometry');
    geometryField.edit = 0;
    $scope.$emit('observation:editStarted', $scope.observation);
    $scope.$on('observation:moved', function(e, observation, geometry) {
      if (!$scope.observation || !geometry) return;

      var geometryField = EventService.getFormField($scope.form, 'geometry');
      geometryField.value = geometry;
    });
    $scope.$on('observation:edit:vertex', function(e, observation, latlng) {
      var geometryField = EventService.getFormField($scope.form, 'geometry');
      if (geometryField.value.type !== 'Point') {
        for (var i = 0; i < geometryField.value.coordinates.length; i++) {
          var coord = geometryField.value.coordinates[i];
          if (coord[0] === latlng.lng && coord[1] === latlng.lat) {
            geometryField.edit = i;
          }
        }
      }
    });
    $scope.$watch('form', function() {
      var obs = {id: $scope.observation.id, geometry: EventService.getFormField($scope.form, 'geometry').value};
      // if ($scope.observation.geometry.type === 'Point') {
        var variantField = EventService.getFormField($scope.form, $scope.form.variantField);
        $scope.$emit('observation:iconEdited', obs, ObservationService.getObservationIconUrlForEvent($scope.event.id, EventService.getFormField($scope.form, 'type').value, variantField ? variantField.value : ''));
      // }
    }, true);
  }

  $scope.getToken = LocalStorageService.getToken;
  $scope.amAdmin = UserService.amAdmin;
  $scope.attachmentUploads = {};

  function formToObservation(form, observation) {
    _.each(form.fields, function(field) {
      if (field.name === 'geometry') {
        observation.geometry = field.value;
      } else {
        observation.properties[field.name] = field.value;
      }
    });
  }

  $scope.save = function() {
    $scope.saving = true;
    var markedForDelete = _.filter($scope.observation.attachments, function(a){ return a.markedForDelete; });
    formToObservation($scope.form, $scope.observation);

    EventService.saveObservation($scope.observation).then(function() {
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
        $scope.$emit('observation:editDone', $scope.observation);
        $scope.saving = false;
      }
    });
  };

  $scope.cancelEdit = function() {
    $scope.$emit('observation:editDone', $scope.observation);

    _.map($scope.observation.attachments, function(attachment) {
      delete attachment.markedForDelete;
      return attachment;
    });
  };

  $scope.deleteObservation = function() {
    EventService.archiveObservation($scope.observation).then(function() {
      $scope.$emit('observation:editDone',  $scope.observation);
    });
  };

  $scope.addAttachment = function() {
    uploadId++;
    $scope.attachmentUploads[uploadId] = false;
  };

  $scope.removeFileUpload = function(id) {
    delete $scope.attachmentUploads[id];
  };

  $scope.$on('observation:move', function(e, observation) {
    if (observation.id) {
      // Don't propagate above this directive if this is en edit
      // for an existing observation
      e.stopPropagation();
    }
  });

  $scope.$on('uploadFile', function(e, id) {
    $scope.attachmentUploads[id] = true;
  });

  $scope.$on('uploadComplete', function(e, url, response, id) {
    EventService.addAttachmentToObservation($scope.observation, response);

    delete $scope.attachmentUploads[id];
    if (_.keys($scope.attachmentUploads).length === 0) {
      $scope.attachmentUploads = {};

      $scope.$emit('observation:editDone', $scope.observation);
      $scope.saving = false;
      $scope.uploadAttachments = false;
    }
  });

  // TODO warn user in some way that attachment didn't upload
  $scope.$on('uploadFailed', function(e, url, response, id) {
    delete $scope.attachmentUploads[id];
    if (_.keys($scope.attachmentUploads).length === 0) {
      $scope.attachmentUploads = {};

      $scope.$emit('observation:editDone');
      $scope.saving = false;
    }
  });
}
