import _ from 'underscore';
import angular from 'angular';

class AdminFormFieldsEditController {
  constructor($state, $stateParams, $uibModal, $timeout, $transitions, LocalStorageService, Event, Form) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$uibModal = $uibModal;
    this.$timeout = $timeout;
    this.$transitions = $transitions;
    this.Event = Event;
    this.Form = Form;

    this.unSavedChanges = false;
    this.token = LocalStorageService.getToken();
  
    this.fieldForms = {};
    this.iconMap = {};
    this.styleMap = {};
  
    this.formSaved = false;
    this.filesToUpload = [];
    this.saveTime = 0;

    this.fieldTypes = [{
      name: 'attachment',
      title: 'Attachment'
    },{
      name: 'checkbox',
      title: 'Checkbox'
    },{
      name: 'date',
      title: 'Date'
    },{
      name: 'email',
      title: 'Email'
    },{
      name: 'hidden',
      title: 'Hidden'
    },{
      name: 'geometry',
      title: 'Location'
    },{
      name: 'numberfield',
      title: 'Number'
    },{
      name: 'radio',
      title: 'Radio Buttons'
    },{
      name: 'dropdown',
      title: 'Select'
    },{
      name: 'multiselectdropdown',
      title: 'Multiple Select',
      hidden: true
    },{
      name: 'textfield',
      title: 'Text'
    },{
      name: 'textarea',
      title: 'Text Area'
    },{
      name: 'userDropdown',
      title: 'User Select'
    },{
      name: 'multiSelectUserDropdown',
      title: 'User Multiple Select',
      hidden: true
    }];

    this.attachmentAllowedTypes = [{
      name: 'image',
      title: 'Image'
    }, {
      name: 'video',
      title: 'Video'
    }, {
      name: 'audio',
      title: 'Audio'
    }]

    this.fieldNameMap = _.indexBy(this.fieldTypes, 'name');
    this.newField = this.createField();

    // accordion settings
    this.accordion = {};
    this.accordion.oneAtATime = true;
    this.variants = [];
  }

  $onInit() {
    this.Event.get({id: this.$stateParams.eventId}, event => {
      this.event = event;
  
      if (this.$stateParams.formId && this.$stateParams.formId !== 'new') {
        const form = _.find(event.forms, form => {
          return form.id.toString() === this.$stateParams.formId;
        });
        this.form = new this.Form(form);
  
        _.each(this.form.fields, field => {
          if (field.name === this.form.primaryField) {
            this.primaryField = field;
          }
        });
      } else if (this.$stateParams.form) {
        this.form = new this.Form();
        this.form.archived = false;
        this.form.color = this.$stateParams.form.color;
        this.form.name = this.$stateParams.form.name;
        this.form.description = this.$stateParams.form.description;
        this.form.fields = [];
        this.form.userFields = [];
      } else {
        this.form = new this.Form();
        this.form.archived = false;
        this.form.color = '#' + (Math.random()*0xFFFFFF<<0).toString(16);
        this.form.fields = [];
        this.form.userFields = [];
      }

      this.previousForm = angular.copy(this.form);
    });

    this.$transitions.onStart({}, transition => { 
      if (this.unSavedChanges) {
        const modalInstance = this.$uibModal.open({
          component: 'adminEventFormEditUnsaved'
        });
  
        modalInstance.result.then(() => {
          this.unSavedChanges = false;
          transition.run();
        });

        return false;
      }

      return true;
    });
  }

  $doCheck() {
    if (!this.form) return;
    if (this.saving) return;

    const dirty = _.some(Object.values(this.fieldForms), form => { return form && form.$dirty; });
    if (dirty) {
      this.unSavedChanges = true;
    }

    this.previousForm = angular.copy(this.form);
  }

  createField() {
    return {
      title : 'New field',
      type : 'textfield',
      required : false,
      choices: []
    };
  }

  deletableField(field) {
    return field.name.indexOf('field') !== -1;
  }

  getTypeValue(field) {
    if (this.isMemberField(field)) {
      return field.type === 'dropdown' ? this.fieldNameMap.userDropdown.title : this.fieldNameMap.multiSelectUserDropdown.title;
    }

    return this.fieldNameMap[field.type].title;
  }

  onFieldTypeChange() {
    if (this.newField.type === 'attachment') {
      this.newField.allowedAttachmentTypes = this.attachmentAllowedTypes.map(type => type.name);
    } else {
      delete this.newField.attachmentAllowedTypes;
    }
  }

  addAllowedAttachmentTypes(field) {
    field.allowedAttachmentTypes = this.attachmentAllowedTypes.map(type => type.name);
  }

  addField() {
    if (this.newFieldForm.$invalid) {
      return;
    }

    const fields = this.form.fields;
    const id = _.isEmpty(fields) ? 0 : _.max(fields, field => { return field.id; }).id + 1;

    this.newField.id = id;
    this.newField.name =  'field' + id;

    if (this.newField.type === 'userDropdown') {
      this.form.userFields.push(this.newField.name);
      this.newField.type = 'dropdown';
    }

    if (this.newField.type === 'dropdown' && this.newField.$multiselect) {
      this.newField.type = 'multiselectdropdown';
    }

    fields.push(this.newField);

    this.newField = this.createField();

    this.unSavedChanges = true;
  }

  removeField(id) {
    const deletedField = _.find(this.form.fields, field => { return id === field.id; });
    if (deletedField) {
      deletedField.archived = true;
    }

    this.unSavedChanges = true;
  }

  moveFieldUp(e, fieldToMoveUp) {
    e.stopPropagation();
    e.preventDefault();

    // find first non-archived field above me
    // and switch our ids to re-order
    const sortedFields = _.sortBy(this.form.fields, field => {
      return field.id;
    });

    let fieldToMoveDown = null;
    for (let i = sortedFields.length - 1; i >= 0; i--) {
      const field = sortedFields[i];
      if (field.id < fieldToMoveUp.id && !field.archived) {
        fieldToMoveDown = field;
        break;
      }
    }

    if (fieldToMoveDown) {
      const fieldToMoveDownId = fieldToMoveDown.id;
      fieldToMoveDown.id = fieldToMoveUp.id;
      fieldToMoveUp.id = fieldToMoveDownId;
    }

    this.unSavedChanges = true;
  }

  moveFieldDown(e, fieldToMoveDown) {
    e.stopPropagation();
    e.preventDefault();

    // find the first non-archived field below me
    // and switch our ids to re-order
    const sortedFields = _.sortBy(this.form.fields, field => {
      return field.id;
    });

    let fieldToMoveUp = null;
    for (let i = 0; i < sortedFields.length; i++) {
      const field = sortedFields[i];
      if (field.id > fieldToMoveDown.id && !field.archived) {
        fieldToMoveUp = field;
        break;
      }
    }

    if (fieldToMoveUp) {
      const fieldToMoveUpId = fieldToMoveUp.id;
      fieldToMoveUp.id = fieldToMoveDown.id;
      fieldToMoveDown.id = fieldToMoveUpId;
    }

    this.unSavedChanges = true;
  }

  showError(error) {
    this.$uibModal.open({
      component: 'adminEventFormEditError',
      resolve: {
        model: () => {
          return error;
        }
      }
    });
  }

  save() {
    const unarchivedFields = _.filter(this.form.fields, field => {
      return !field.archived;
    });
    if (_.isEmpty(unarchivedFields)) {
      return;
    }

    this.formSaved = false;
    this.saving = true;

    this.form.$save({eventId: this.event.id, id: this.form.id}, () => {
      _.each(this.form.fields, field => {
        if (this.isMemberField(field)) {
          field.choices = [];
        }
      });

      this.saving = false;
      this.formSaved = true;
      this.completeSave();
    }, response => {
      const data = response.data || {};
      this.showError({
        title:  'Error Saving Form',
        message: data.errors ?
          "If the problem persists please contact your MAGE administrator for help." :
          "Please try again later, if the problem persists please contact your MAGE administrator for help.",
        errors: data.errors
      });
      this.saving = false;
    });
  }

  completeSave() {
    if (this.formSaved) {
      this.saving = false;
      this.unSavedChanges = false;

      Object.values(this.fieldForms).forEach(form => {
        if (form) form.$setPristine();
      });

      delete this.exportError;

      if (this.$state.current.url.indexOf('/forms/new') !== -1) {
        this.$state.go('admin.formFieldsEdit', { eventId: this.event.id, formId: this.form.id });
        return;
      }
    }
  }

  addOption(field, optionTitle) {
    field.choices = field.choices || new Array();

    const choiceId = _.isEmpty(field.choices) ? 1 : _.max(field.choices, choice => { return choice.id; }).id + 1;
    field.choices.push({
      id: choiceId,
      title: optionTitle,
      value: field.choices.length
    });

    this.unSavedChanges = true;
  }

  deleteOption(field, option) {
    for (var i = 0; i < field.choices.length; i++) {
      if (field.choices[i].title === option.title) {
        field.choices.splice(i, 1);
        break;
      }
    }

    this.unSavedChanges = true;
  }

  reorderOption(field, option) {
    const modalInstance = this.$uibModal.open({
      component: 'adminEventFormFieldOptionReorder',
      resolve: {
        option: () => {
          return option;
        },
        field: () => {
          return field;
        }
      }
    });

    modalInstance.result.then(choices => {
      field.choices = choices;
      this.unSavedChanges = true;
    });
  }

  showAddOptions(field) {
    return field.type === 'radio' || field.type === 'dropdown'  || field.type === 'multiselectdropdown';
  }

  hideAddOptions(field) {
    return field.type === 'radio' ||
           field.type === 'dropdown' ||
           field.type === 'userDropdown';
  }

  isMemberField (field) {
    return _.contains(this.form.userFields, field.name);
  }

  isUserDropdown(field) {
    return field.type === 'userDropdown';
  }
}

AdminFormFieldsEditController.$inject = ['$state', '$stateParams', '$uibModal', '$timeout', '$transitions', 'LocalStorageService', 'Event', 'Form'];

export default {
  template: require('./fields.edit.html'),
  controller: AdminFormFieldsEditController
};
