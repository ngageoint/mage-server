var _ = require('underscore')
  , $ = require('jquery')
  , angular = require('angular');

module.exports = AdminEventEditFormFieldsController;

AdminEventEditFormFieldsController.$inject = ['$rootScope', '$scope', '$location', '$filter', '$routeParams', '$q', '$timeout', '$uibModal', 'LocalStorageService', 'EventService', 'Event', 'Form', 'FormIcon'];

function AdminEventEditFormFieldsController($rootScope, $scope, $location, $filter, $routeParams, $q, $timeout, $uibModal, LocalStorageService, EventService, Event, Form, FormIcon) {
  $scope.unSavedChanges = false;
  $scope.unSavedUploads = false;
  $scope.token = LocalStorageService.getToken();
  var locationForm = $location.search().form;

  var icons = {};
  $scope.iconMap = {};
  $scope.styleMap = {};

  var formSaved = false;
  $scope.filesToUpload = [];
  $scope.saveTime = 0;

  Event.get({id: $routeParams.eventId}, function(event) {
    $scope.event = event;

    if ($routeParams.formId && $routeParams.formId !== 'new') {
      var form = _.find(event.forms, function(form) {
        return form.id.toString() === $routeParams.formId;
      });
      $scope.form = new Form(form);

      _.each($scope.form.fields, function(field) {
        if (field.name === $scope.form.primaryField) {
          $scope.primaryField = field;
        }
      });
    } else if (locationForm) {
      locationForm = JSON.parse(locationForm)
      $scope.form = new Form();
      $scope.form.archived = false;
      $scope.form.color = locationForm.color;
      $scope.form.name = locationForm.name;
      $scope.form.description = locationForm.description;
      $scope.form.fields = [];
      $scope.form.userFields = [];
    } else {
      $scope.form = new Form();
      $scope.form.archived = false;
      $scope.form.color = '#' + (Math.random()*0xFFFFFF<<0).toString(16);
      $scope.form.fields = [];
      $scope.form.userFields = [];
    }
  });

  $scope.$watch('form', function(newForm, oldForm) {
    if (!newForm || !oldForm) return;

    if ($scope.saving) return;

    if (!newForm.id || oldForm.id) {
      $scope.unSavedChanges = true;
    }

  }, true);

  $scope.fieldTypes = [{
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

  var fieldNameMap = _.indexBy($scope.fieldTypes, 'name');

  $scope.newField = newField();

  function newField() {
    return {
      title : "New field",
      type : 'textfield',
      required : false,
      choices: []
    };
  }

  // accordion settings
  $scope.accordion = {};
  $scope.accordion.oneAtATime = true;
  $scope.variants = [];

  $scope.deletableField = function(field) {
    return field.name.indexOf('field') !== -1;
  };

  $scope.getTypeValue = function(field) {
    if ($scope.isMemberField(field)) {
      return field.type === 'dropdown' ? fieldNameMap.userDropdown.title : fieldNameMap.multiSelectUserDropdown.title;
    }

    return fieldNameMap[field.type].title;
  };

  // create new field button click
  $scope.addNewField = function() {
    var fields = $scope.form.fields;
    var id = _.isEmpty(fields) ? 1 : _.max(fields, function(field) { return field.id; }).id + 1;

    $scope.newField.id = id;
    $scope.newField.name =  'field' + id;

    if ($scope.newField.type === 'userDropdown') {
      $scope.form.userFields.push($scope.newField.name);
      $scope.newField.type = 'dropdown';
    }

    if ($scope.newField.type === 'dropdown' && $scope.newField.$multiselect) {
      $scope.newField.type = 'multiselectdropdown';
    }

    fields.push($scope.newField);

    $scope.newField = newField();
  };

  $scope.moveFieldUp = function(e, fieldToMoveUp) {
    e.stopPropagation();
    e.preventDefault();

    // find first non-archived field above me
    // and switch our ids to re-order
    var sortedFields = _.sortBy($scope.form.fields, function(field) {
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
  };

  $scope.moveFieldDown = function(e, fieldToMoveDown) {
    e.stopPropagation();
    e.preventDefault();

    // find the first non-archived field below me
    // and switch our ids to re-order
    var sortedFields = _.sortBy($scope.form.fields, function(field) {
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
  };

  var debouncedAutoSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.form.$save({eventId: $scope.event.id, id: $scope.form.id}, function() {
        _.each($scope.form.fields, function(field) {
          if ($scope.isMemberField(field)) {
            field.choices = [];
          }
        });

        // Upload icons if any
        _.each($scope.filesToUpload, function(fileUpload) {
          upload(fileUpload);
        });

        $scope.saving = false;
        formSaved = true;
        completeSave();
      }, function(response) {
        var data = response.data || {};
        showError({
          title:  'Error Saving Form',
          message: data.errors ?
            "If the problem persists please contact your MAGE administrator for help." :
            "Please try again later, if the problem persists please contact your MAGE administrator for help.",
          errors: data.errors
        });
        $scope.saving = false;
      });
    });
  }, 1000);

  function showError(error) {
    $uibModal.open({
      template: require('./event.edit.form.error.html'),
      controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
        $scope. model = error;

        $scope.ok = function() {
          $uibModalInstance.dismiss();
        };
      }]
    });
  }

  $scope.saveForm = function() {
    var unarchivedFields = _.filter($scope.form.fields, function(field) {
      return !field.archived;
    });
    if (_.isEmpty(unarchivedFields)) {
      return;
    }

    formSaved = false;
    $scope.saving = true;
    debouncedAutoSave();
  };

  function completeSave() {
    if (formSaved) {
      $scope.saving = false;
      $scope.unSavedChanges = false;
      delete $scope.exportError;

      if ($location.path().indexOf('/forms/new') !== -1) {
        $location.path('/admin/events/' + $scope.event.id + '/forms/' + $scope.form.id +'/fields');
        return;
      }
    }
  }

  // deletes particular field on button click
  $scope.deleteField = function (id) {
    var deletedField = _.find($scope.form.fields, function(field) { return id === field.id; });
    if (deletedField) {
      deletedField.archived = true;
      $scope.populateVariants();
    }
  };

  // add new option to the field
  $scope.addOption = function (field, optionTitle) {
    field.choices = field.choices || new Array();

    var choiceId = _.isEmpty(field.choices) ? 1 : _.max(field.choices, function(choice) { return choice.id; }).id + 1;
    field.choices.push({
      id: choiceId,
      title: optionTitle,
      value: field.choices.length
    });

    $scope.populateVariants();
  };

  $scope.reorderOption = function(field, option) {
    var modalInstance = $uibModal.open({
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
  };

  // delete select option
  $scope.deleteOption = function (field, option) {
    for (var i = 0; i < field.choices.length; i++) {
      if (field.choices[i].title === option.title) {
        field.choices.splice(i, 1);
        break;
      }
    }
    $scope.populateVariants();
  };

  // decides whether field options block will be shown (true for dropdown and radio fields)
  $scope.showAddOptions = function(field) {
    return field.type === 'radio' || field.type === 'dropdown'  || field.type === 'multiselectdropdown';
  };

  $scope.hideAddOptions = function(field) {
    return field.type === 'radio' ||
           field.type === 'dropdown' ||
           field.type === 'userDropdown';
  };

  $scope.isMemberField = function(field) {
    return _.contains($scope.form.userFields, field.name);
  };

  $scope.isUserDropdown = function(field) {
    return field.type === 'userDropdown';
  };

  var disableLocationChangeStart = $rootScope.$on("$locationChangeStart", function(event, next) {
    if ($scope.unSavedChanges) {
      event.preventDefault();

      var modalInstance = $uibModal.open({
        template: require('./event.edit.form.unsaved.html')
      });

      modalInstance.result.then(function(result) {
        if (result === 'ok') {
          // discard changes
          disableLocationChangeStart();
          $location.path($location.url(next).hash());
        }
      });
    } else {
      disableLocationChangeStart();
    }
  });
}
