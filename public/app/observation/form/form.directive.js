var angular = require('angular')
  , _ = require('underscore')
  , MDCTopAppBar = require('material-components-web').topAppBar.MDCTopAppBar;

module.exports = function formDirective() {
  var directive = {
    template: require('./form.directive.html'),
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
};

FormDirectiveController.$inject = ['$scope', 'EventService', 'FilterService', 'Observation', 'ObservationService', 'UserService', 'LocalStorageService', '$element'];

function FormDirectiveController($scope, EventService, FilterService, Observation, ObservationService, UserService, LocalStorageService, $element) {
  // const topAppBar = new MDCTopAppBar($element.find('.mdc-top-app-bar')[0])
  var uploadId = 0;
  var initialObservation;

  if ($scope.observation) {
    initialObservation = JSON.parse(JSON.stringify($scope.observation));
    $scope.iconUrl = $scope.observation.style.iconUrl;
    $scope.event = EventService.getEventById($scope.observation.eventId);
    var editedVertex = 0;
    var geometryField = $scope.form.geometryField;
    $scope.shape = geometryField.value.type;
    var copy = JSON.parse(JSON.stringify(geometryField.value));
    geometryField.value = copy;
    updateGeometryEdit(geometryField, editedVertex);
    $scope.$emit('observation:editStarted', $scope.observation);

    $scope.$on('feature:moved', function(e, feature, geometry) {
      if (!$scope.observation || !geometry) return;

      // Disable save if line/polygon until line/polygon edit is complete
      if (geometry.type === 'LineString' || geometry.type === 'Polygon') {
        $scope.observationForm.$setValidity('geometry', true);
      }

      $scope.form.geometryField.value = geometry;
      $scope.form.geometryField = angular.copy($scope.form.geometryField);
      updateGeometryEdit($scope.form.geometryField, editedVertex);
    });

    $scope.$on('mage:map:edit:vertex', function(e, observation, geometry, index) {
      editedVertex = index;

      $scope.form.geometryField.value = geometry;
      $scope.form.geometryField = angular.copy($scope.form.geometryField);
      updateGeometryEdit($scope.form.geometryField, editedVertex);
    });

    // TODO update this to watch primary, secondary and geometry type
    $scope.$watch('form', function() {
      if ($scope.form.geometryField.value.type !== 'Point') {
        return;
      }

      var formId = null;
      var primary = null;
      var variant = null;
      if ($scope.form.forms.length > 0) {
        var firstForm = $scope.form.forms[0];
        formId = firstForm.id;

        var primaryField = EventService.getFormField(firstForm, firstForm.primaryField);
        primary = primaryField ? primaryField.value : null;

        var variantField = EventService.getFormField(firstForm, firstForm.variantField);
        variant = variantField ? variantField.value : null;
      }

      $scope.iconUrl = ObservationService.getObservationIconUrlForEvent($scope.event.id, formId, primary, variant);
      $scope.$emit('observation:iconEdited', {id: $scope.observation.id, geometry: angular.copy($scope.form.geometryField.value)}, $scope.iconUrl);
    }, true);
  }

  $scope.getToken = LocalStorageService.getToken;
  $scope.canDeleteObservation = hasEventUpdatePermission() || isCurrentUsersObservation() || hasUpdatePermissionsInEventAcl();
  $scope.attachmentUploads = {};

  $scope.$watch('form.geometryField', function(field) {
    $scope.$emit('observation:geometryChanged', {id: $scope.observation.id, geometry: angular.copy(field.value)});
  }, true);

  $scope.$watch('form.geometryField.value.type', function(newShapeType, oldShapeType) {
    if (newShapeType === oldShapeType) return;

    // Disable save if line/polygon until line/polygon edit is complete
    var geometryValid = newShapeType === 'LineString' || newShapeType === 'Polygon' ? false : true;
    $scope.observationForm.$setValidity('geometry', geometryValid);

    $scope.$emit('observation:shapeChanged', {id: $scope.observation.id, type: 'Feature', geometry: {type: newShapeType}});
  });

  function hasEventUpdatePermission() {
    return _.contains(UserService.myself.role.permissions, 'DELETE_OBSERVATION');
  }

  function isCurrentUsersObservation() {
    return $scope.observation.userId === UserService.myself.id;
  }

  function hasUpdatePermissionsInEventAcl() {
    var myAccess = FilterService.getEvent().acl[UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];
    return _.contains(aclPermissions, 'update');
  }

  function updateGeometryEdit(geometryField, index) {
    if (!geometryField.value.coordinates) return;

    geometryField.editedVertex = index;
    if (geometryField.value.type === 'LineString') {
      geometryField.edit = angular.copy(geometryField.value.coordinates[index]);
    } else if (geometryField.value.type === 'Polygon') {
      if (geometryField.value.coordinates[0]) {
        geometryField.edit = angular.copy(geometryField.value.coordinates[0][index]);
      }
    }
  }

  function formToObservation(form, observation) {
    var geometry = form.geometryField.value;

    // put all coordinates in -180 to 180
    switch (geometry.type) {
    case 'Point':
      if (geometry.coordinates[0] < -180) geometry.coordinates[0] = geometry.coordinates[0] + 360;
      else if (geometry.coordinates[0] > 180) geometry.coordinates[0] = geometry.coordinates[0] - 360;
      break;
    case 'LineString':
      for (var i = 0; i < geometry.coordinates.length; i++) {
        var coord = geometry.coordinates[i];
        while (coord[0] < -180) coord[0] = coord[0] + 360;
        while (coord[0] > 180) coord[0] = coord[0] - 360;
      }
      break;
    case 'Polygon':
      for (var p = 0; p < geometry.coordinates.length; p++) {
        var poly = geometry.coordinates[p];
        for (var i = 0; i < poly.length; i++) {
          var coord = poly[i];
          while (coord[0] < -180) coord[0] = coord[0] + 360;
          while (coord[0] > 180) coord[0] = coord[0] - 360;
        }
      }
      break;
    }
    observation.geometry = geometry;

    observation.properties.timestamp = form.timestampField.value;

    observation.properties.forms = [];
    _.each(form.forms, function(observationForm) {
      var propertiesForm = {
        formId: observationForm.id
      };

      var fields = _.filter(observationForm.fields, function(field) {
        return !field.archived;
      });

      _.each(fields, function(field) {
        propertiesForm[field.name] = field.value;
      });

      observation.properties.forms.push(propertiesForm);
    });
  }

  $scope.save = function() {
    $scope.saving = true;
    var markedForDelete = _.filter($scope.observation.attachments, function(a){ return a.markedForDelete; });
    formToObservation($scope.form, $scope.observation);
    // TODO look at this: this is a hack that will be corrected when we pull ids from the server
    if ($scope.observation.id === 'new') {
      delete $scope.observation.id;
    }
    EventService.saveObservation($scope.observation).then(function() {
      $scope.error = null;

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
    }, function(err) {
      $scope.saving = false;
      $scope.error = {
        message: err.data
      };
    });
  };

  $scope.cancelEdit = function() {
    $scope.observation.geometry = initialObservation.geometry;
    $scope.$emit('observation:editDone', $scope.observation);

    _.map($scope.observation.attachments, function(attachment) {
      delete attachment.markedForDelete;
      return attachment;
    });
  };

  $scope.deleteObservation = function() {
    EventService.archiveObservation($scope.observation).then(function() {
      $scope.$emit('observation:delete',  $scope.observation);
    });
  };

  $scope.addAttachment = function() {
    uploadId++;
    $scope.attachmentUploads[uploadId] = false;
  };

  $scope.$on('removeUpload', function(e, id) {
    delete $scope.attachmentUploads[id];
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
