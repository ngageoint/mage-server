var angular = require('angular')
  , _ = require('underscore');

class FormController {
  constructor($element, $uibModal, MapService, UserService, EventService, ObservationService, FilterService, LocalStorageService) {
    this.$element = $element;
    this.$uibModal = $uibModal;
    this.MapService = MapService;
    this.UserService = UserService;
    this.EventService = EventService;
    this.ObservationService = ObservationService;
    this.FilterService = FilterService;
    this.LocalStorageService = LocalStorageService;
  }

  $onInit() {
    this.scrollElement = this.$element[0].parentElement;

    this.inactive = true;
    this.uploadId = 0;
    this.initialObservation;
    this.primaryField;
    this.secondaryField;
    this.primaryFieldValue;
    this.secondaryFieldValue;

    this.getToken = this.LocalStorageService.getToken;

    this.canDeleteObservation = this.hasEventUpdatePermission() || this.isCurrentUsersObservation() || this.hasUpdatePermissionsInEventAcl();
    this.attachmentUploads = {};
  }

  $onChanges() {
    if (this.observation) {
      this.isNewObservation = this.observation.id === 'new';

      this.initialObservation = JSON.parse(JSON.stringify(this.observation));
      this.event = this.EventService.getEventById(this.observation.eventId);

      // TODO figure out if I still need this?
      var geometryField = this.form.geometryField;
      this.shape = geometryField.value.type;
      var copy = JSON.parse(JSON.stringify(geometryField.value));
      geometryField.value = copy;
      this.geometryFeature = {
        id: this.observation.id,
        type: 'Feature',
        geometry: copy,
        style: angular.copy(this.observation.style),
        properties: angular.copy(this.observation.properties)
      };

      if (this.isNewObservation) {
        this.MapService.addFeaturesToLayer([this.observation], 'Observations');
      }
    }

    if (this.form) {
      const primaryForm = this.form.forms.length ? this.form.forms[0] : { fields: [] };
      this.primaryField = _.find(primaryForm.fields, field => {
        return field.name === primaryForm.primaryField;
      }) || {};

      this.secondaryField = _.find(primaryForm.fields, field => {
        return field.name === primaryForm.variantField;
      }) || {};
    }
  }

  $doCheck() {
    if (this.primaryField.value !== this.primaryFieldValue || this.secondaryField.value !== this.secondaryFieldValue) {
      this.primaryFieldValue = this.primaryField.value;
      this.secondaryFieldValue = this.secondaryField.value;

      let observation = angular.copy(this.observation);
      this.formToObservation(this.form, observation);

      const style = this.ObservationService.getObservationStyleForForm(observation, this.event, this.form.forms[0]);
      observation.style = style;
      this.geometryFeature.style = style;

      this.MapService.updateFeatureForLayer(observation, 'Observations');
    }
  }

  hasEventUpdatePermission() {
    return _.contains(this.UserService.myself.role.permissions, 'DELETE_OBSERVATION');
  }

  isCurrentUsersObservation() {
    return this.observation.userId === this.UserService.myself.id;
  }

  hasUpdatePermissionsInEventAcl() {
    var myAccess = this.FilterService.getEvent().acl[this.UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];
    return _.contains(aclPermissions, 'update');
  }

  formToObservation(form, observation) {
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
    _.each(form.forms, observationForm => {
      var propertiesForm = {
        formId: observationForm.id
      };

      var fields = _.filter(observationForm.fields, function (field) {
        return !field.archived;
      });

      _.each(fields, function (field) {
        propertiesForm[field.name] = field.value;
      });

      observation.properties.forms.push(propertiesForm);
    });
  }

  onGeometryEdit($event) {
    this.mask = $event.action === 'edit';
  }

  onGeometryChanged($event) {
    this.geometryFeature = $event.feature;
    this.form.geometryField.value = $event.feature ? $event.feature.geometry : null;
  }

  save() {
    if (!this.form.geometryField.value) {
      this.error = {
        message: 'Location is required'
      };
      return;
    }
    this.saving = true;
    var markedForDelete = _.filter(this.observation.attachments, a => { return a.markedForDelete; });
    this.formToObservation(this.form, this.observation);
    // TODO look at this: this is a hack that will be corrected when we pull ids from the server
    const id = this.observation.id;
    if (id === 'new') {
      delete this.observation.id;
    }
    this.EventService.saveObservation(this.observation).then(() => {
      // If this feature was added to the map as a new observation, remove it
      // as the event service will add it back to the map based on it new id
      // if it passes the current filter.
      if (id === 'new') {
        this.MapService.removeFeatureFromLayer({ id: id }, 'Observations');
      }

      this.error = null;

      if (_.some(_.values(this.attachmentUploads), v => { return v; })) {
        this.uploadAttachments = true;
      } else {
        this.form = null;
        this.attachmentUploads = {};
      }

      // delete any attachments that were marked for delete
      _.each(markedForDelete, attachment => {
        this.EventService.deleteAttachmentForObservation(this.observation, attachment);
      });

      if (!this.uploadAttachments) {
        this.saving = false;
        this.onFormClose()
      }
    }, err => {
      if (id === 'new') {
        this.observation.id = 'new';
      }

      this.saving = false;
      this.error = {
        message: err.data
      };
    });
  }

  cancelEdit() {
    this.observation.geometry = this.initialObservation.geometry;
    if (this.observation.id !== 'new') {
      this.MapService.updateFeatureForLayer(this.observation, 'Observations');
    } else {
      this.MapService.removeFeatureFromLayer(this.observation, 'Observations');
    }

    _.map(this.observation.attachments, attachment => {
      delete attachment.markedForDelete;
      return attachment;
    });

    this.onFormClose();
  }

  deleteObservation () {
    const modalInstance = this.$uibModal.open({
      template: require('./delete-observation.html'),
      controller: 'DeleteObservationController',
      backdrop: 'static',
      resolve: {
        observation: () => {
          return this.observation;
        }
      }
    });

    modalInstance.result.then(() => {
      this.onObservationDelete({
        $event: { observation: this.observation }
      });
    });
  }

  addAttachment() {
    uploadId++;
    this.attachmentUploads[uploadId] = false;
  }

  onAttachmentAdd($event) {
    this.attachmentUploads[$event.id] = true;
  }

  onAttachmentRemove($event) {
    delete this.attachmentUploads[$event.id];
  }

  onAttachmentUploaded($event) {
    this.EventService.addAttachmentToObservation(this.observation, $event.response);

    delete this.attachmentUploads[$event.id];
    if (_.keys(this.attachmentUploads).length === 0) {
      this.attachmentUploads = {};

      this.saving = false;
      this.uploadAttachments = false;
      this.onFormClose();
    }
  }

  onAttachmentError($event) {
    // TODO warn user in some way that attachment didn't upload
    delete this.attachmentUploads[$event.id];
    if (_.keys($scope.attachmentUploads).length === 0) {
      this.attachmentUploads = {};

      this.saving = false;
      this.uploadAttachments = false;
      this.onFormClose();
    }
  }
}

FormController.$inject = ['$element', '$uibModal', 'MapService', 'UserService', 'EventService', 'ObservationService', 'FilterService', 'LocalStorageService'];

export default {
  template: require('./form.html'),
  bindings: {
    form: '<',
    observation: '<',
    preview: '<',
    onFormClose: '&',
    onObservationDelete: '&'
  },
  controller: FormController
};