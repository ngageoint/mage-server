var angular = require('angular')
  , _ = require('underscore')
  , MDCTopAppBar = require('material-components-web').topAppBar.MDCTopAppBar;

module.exports = function formDirective() {
  var directive = {
    template: require('./form.directive.html'),
    restrict: 'E',
    transclude: true,
    scope: {
      map: '=',
      another: '=',
      form: '=',
      observation: '=formObservation',
      preview: '=formPreview'
    },
    controller: FormDirectiveController
  };

  return directive;
};

FormDirectiveController.$inject = ['$scope', 'MapService', 'ObservationService', 'EventService', 'FilterService', 'UserService', 'LocalStorageService', '$element', '$uibModal'];

function FormDirectiveController($scope, MapService, ObservationService, EventService, FilterService, UserService, LocalStorageService, $element, $uibModal) {
  var scrollElement = $element[0].parentElement;
  const topAppBar = new MDCTopAppBar($element.find('.mdc-top-app-bar')[0]);
  topAppBar.setScrollTarget(scrollElement);

  $scope.inactive = true;

  var uploadId = 0;
  var initialObservation;

  if ($scope.observation) {
    initialObservation = JSON.parse(JSON.stringify($scope.observation));
    $scope.event = EventService.getEventById($scope.observation.eventId);

    // TODO figure out if I still need this?
    var geometryField = $scope.form.geometryField;
    $scope.shape = geometryField.value.type;
    var copy = JSON.parse(JSON.stringify(geometryField.value));
    geometryField.value = copy;
    $scope.geometryFeature = {
      id: $scope.observation.id,
      type: 'Feature',
      geometry: copy,
      style: angular.copy($scope.observation.style),
      properties: angular.copy($scope.observation.properties)
    };

    if ($scope.observation.id === 'new') {
      MapService.addFeaturesToLayer([$scope.observation], 'Observations');
    }
  }

  let primaryField;
  let secondaryField;  
  if ($scope.form) {
    const primaryForm = $scope.form.forms.length ? $scope.form.forms[0] : {fields: []};
    primaryField = _.find(primaryForm.fields, function(field) {
      return field.name === primaryForm.primaryField;
    }) || {};

    secondaryField = _.find(primaryForm.fields, function(field) {
      return field.name === primaryForm.variantField;
    }) || {};
  }

  $scope.getToken = LocalStorageService.getToken;
  $scope.canDeleteObservation = hasEventUpdatePermission() || isCurrentUsersObservation() || hasUpdatePermissionsInEventAcl();
  $scope.attachmentUploads = {};

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

  let primaryFieldValue;
  let secondaryFieldValue;
  $scope.$watch('form.forms[0]', function() {
    if (primaryField.value !== primaryFieldValue || secondaryField.value !== secondaryFieldValue) {
      primaryFieldValue = primaryField.value;
      secondaryFieldValue = secondaryField.value;

      let observation = angular.copy($scope.observation);
      formToObservation($scope.form, observation);
  
      const style = ObservationService.getObservationStyleForForm(observation, $scope.event, $scope.form.forms[0]);
      observation.style = style;
      $scope.geometryFeature.style = style;
  
      MapService.updateFeatureForLayer(observation, 'Observations');
    }
  }, true);

  $scope.onGeometryEdit = function($event) {
    $scope.mask = $event.action === 'edit';
  };

  $scope.onGeometryChanged = function($event) {
    $scope.geometryFeature = $event.feature;
    $scope.form.geometryField.value = $event.feature ? $event.feature.geometry : null;
  };

  $scope.save = function() {
    if (!$scope.form.geometryField.value) {
      $scope.error = {
        message: 'Location is required'
      };
      return;
    }
    $scope.saving = true;
    var markedForDelete = _.filter($scope.observation.attachments, function(a){ return a.markedForDelete; });
    formToObservation($scope.form, $scope.observation);
    // TODO look at this: this is a hack that will be corrected when we pull ids from the server
    const id = $scope.observation.id;
    if (id === 'new') {
      delete $scope.observation.id;
    }
    EventService.saveObservation($scope.observation).then(function() {
      // If this feature was added to the map as a new observation, remove it
      // as the event service will add it back to the map based on it new id
      // if it passes the current filter.
      if (id === 'new') {
        MapService.removeFeatureFromLayer({id: id}, 'Observations');
      }

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
      if (id === 'new') {
        $scope.observation.id = 'new';
      }

      $scope.saving = false;
      $scope.error = {
        message: err.data
      };
    });
  };

  $scope.cancelEdit = function() {
    $scope.observation.geometry = initialObservation.geometry;
    $scope.$emit('observation:editDone', $scope.observation);

    if ($scope.observation.id !== 'new') {
      MapService.updateFeatureForLayer($scope.observation, 'Observations');
    } else {
      MapService.removeFeatureFromLayer($scope.observation, 'Observations');
    }

    _.map($scope.observation.attachments, function(attachment) {
      delete attachment.markedForDelete;
      return attachment;
    });
  };

  $scope.deleteObservation = function() {
    $uibModal.open({
      template: require('./delete-observation.html'),
      controller: 'DeleteObservationController',
      backdrop: 'static',
      scope: $scope,
      resolve: {
        observation: function () {
          return $scope.observation;
        }
      }
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
