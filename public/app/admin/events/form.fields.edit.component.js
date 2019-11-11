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
    this.unSavedUploads = false;
    this.token = LocalStorageService.getToken();
  
    this.fieldForms = {};
    this.iconMap = {};
    this.styleMap = {};
  
    this.formSaved = false;
    this.filesToUpload = [];
    this.saveTime = 0;

    this.fieldTypes = [{
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
      name: 'password',
      title: 'Password'
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
        var form = _.find(event.forms, form => {
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
        var modalInstance = this.$uibModal.open({
          template: require('./event.edit.form.unsaved.html')
        });
  
        modalInstance.result.then(result => {
          if (result === 'ok') {
            this.unSavedChanges = false;
            this.$state.go(transition.to());
          }
        });

        return false;
      }

      return true;
    });
  }

  $doCheck() {
    if (!this.form ) return;
    if (this.saving) return;

    var isFieldArchived = field => { return field.archived; };
    var removedField = _.filter(this.form.fields, isFieldArchived).length > _.filter(this.previousForm.fields, isFieldArchived).length;
    var addedField = this.form.fields.length > this.previousForm.fields.length;
    var dirty = _.some(Object.values(this.fieldForms), form => { return form && form.$dirty; });

    if (dirty || removedField || addedField) {
      this.unSavedChanges = true;
    }

    this.previousForm = angular.copy(this.form);
  }

  createField() {
    return {
      title : "New field",
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

  addNewField() {
    if (this.newFieldForm.$invalid) {
      return;
    }

    var fields = this.form.fields;
    var id = _.isEmpty(fields) ? 1 : _.max(fields, field => { return field.id; }).id + 1;

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
  }

  moveFieldUp(e, fieldToMoveUp) {
    e.stopPropagation();
    e.preventDefault();

    // find first non-archived field above me
    // and switch our ids to re-order
    var sortedFields = _.sortBy(this.form.fields, field => {
      return field.id;
    });

    var fieldToMoveDown = null;
    for (var i = sortedFields.length - 1; i >= 0; i--) {
      var field = sortedFields[i];
      if (field.id < fieldToMoveUp.id && !field.archived) {
        fieldToMoveDown = field;
        break;
      }
    }

    if (fieldToMoveDown) {
      var fieldToMoveDownId = fieldToMoveDown.id;
      fieldToMoveDown.id = fieldToMoveUp.id;
      fieldToMoveUp.id = fieldToMoveDownId;
    }
  }

  moveFieldDown(e, fieldToMoveDown) {
    e.stopPropagation();
    e.preventDefault();

    // find the first non-archived field below me
    // and switch our ids to re-order
    var sortedFields = _.sortBy(this.form.fields, field => {
      return field.id;
    });

    var fieldToMoveUp = null;
    for (var i = 0; i < sortedFields.length; i++) {
      var field = sortedFields[i];
      if (field.id > fieldToMoveDown.id && !field.archived) {
        fieldToMoveUp = field;
        break;
      }
    }

    if (fieldToMoveUp) {
      var fieldToMoveUpId = fieldToMoveUp.id;
      fieldToMoveUp.id = fieldToMoveDown.id;
      fieldToMoveDown.id = fieldToMoveUpId;
    }
  }

  showError(error) {
    // TODO make component
    this.$uibModal.open({
      template: require('./event.edit.form.error.html'),
      controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
        $scope. model = error;

        $scope.ok = function() {
          $uibModalInstance.dismiss();
        };
      }]
    });
  }

  saveForm() {
    var unarchivedFields = _.filter(this.form.fields, field => {
      return !field.archived;
    });
    if (_.isEmpty(unarchivedFields)) {
      return;
    }

    this.formSaved = false;
    this.saving = true;
    this.debouncedAutoSave();
  }

  debouncedAutoSave() {
    _.debounce(() => {
      this.$timeout(() => {
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
          var data = response.data || {};
          this.showError({
            title:  'Error Saving Form',
            message: data.errors ?
              "If the problem persists please contact your MAGE administrator for help." :
              "Please try again later, if the problem persists please contact your MAGE administrator for help.",
            errors: data.errors
          });
          this.saving = false;
        });
      });
    }, 1000)();
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
        this.$state.go('admin.fieldsEdit', { eventId: this.event.id, formId: this.form.id });
        return;
      }
    }
  }

  deleteField(id) {
    var deletedField = _.find(this.form.fields, field => { return id === field.id; });
    if (deletedField) {
      deletedField.archived = true;
    }
  }

  addOption(field, optionTitle) {
    field.choices = field.choices || new Array();

    var choiceId = _.isEmpty(field.choices) ? 1 : _.max(field.choices, choice => { return choice.id; }).id + 1;
    field.choices.push({
      id: choiceId,
      title: optionTitle,
      value: field.choices.length
    });
  }

  deleteOption(field, option) {
    for (var i = 0; i < field.choices.length; i++) {
      if (field.choices[i].title === option.title) {
        field.choices.splice(i, 1);
        break;
      }
    }
  }

  reorderOption(field, option) {
    // TODO make component
    var modalInstance = this.$uibModal.open({
      template: require('./event.field.option.reorder.html'),
      controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
        $scope.model = {
          option: option,
          choices: field.choices.slice()
        };

        $scope.move = function(choiceIndex) {
          var optionIndex = _.findIndex($scope.model.choices, function(c) {
            return c.title === $scope.model.option.title;
          });

          // Moving down subtract an index
          if (choiceIndex > optionIndex) {
            choiceIndex--;
          }

          $scope.model.choices.splice(choiceIndex, 0, $scope.model.choices.splice(optionIndex, 1)[0]);
        };

        $scope.done = function() {
          $uibModalInstance.close($scope.model.choices);
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (choices) {
      field.choices = choices;
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
  template: require('./form.fields.edit.html'),
  controller: AdminFormFieldsEditController
};
