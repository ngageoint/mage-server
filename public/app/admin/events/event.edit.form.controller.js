angular
  .module('mage')
  .controller('AdminEventEditFormController', AdminEventEditFormController);

AdminEventEditFormController.$inject = ['$rootScope', '$scope', '$location', '$filter', '$routeParams', '$q', '$timeout', '$modal', 'LocalStorageService', 'EventService', 'Event'];

function AdminEventEditFormController($rootScope, $scope, $location, $filter, $routeParams, $q, $timeout, $modal, LocalStorageService, EventService, Event) {
  $scope.unSavedChanges = false;
  $scope.token = LocalStorageService.getToken();

  var formSaved = false;
  var unsavedIcons = 0;
  $scope.uploadIcons = false;

  $scope.saveTime = 0;

  Event.get({id: $routeParams.eventId}, function(event) {
    $scope.event = event;

    _.each(event.form.fields, function(field) {
      if (field.name == 'type') {
        $scope.typeField = field;
      }
    });
  });

  $scope.$watch('event.form', function(newForm, oldForm) {
    if (!newForm || !oldForm) return;

    $scope.unSavedChanges = true;
  }, true);

  $scope.$on('uploadFile', function() {
    $scope.unSavedChanges = true;

    unsavedIcons++;
  });

  $scope.$on('uploadComplete', function(url, response, uploadId) {
    unsavedIcons--;
    completeSave();
  });

  $scope.fileUploadOptions = {};

  $scope.fieldTypes = [{
    name : 'textfield',
    value : 'Textfield'
  },{
    name : 'email',
    value : 'E-mail'
  },{
    name : 'password',
    value : 'Password'
  },{
    name : 'radio',
    value : 'Radio Buttons'
  },{
    name : 'dropdown',
    value : 'Dropdown List'
  },{
    name : 'date',
    value : 'Date'
  },{
    name : 'geometry',
    value : 'Geometry'
  },{
    name : 'textarea',
    value : 'Text Area'
  },{
    name : 'checkbox',
    value : 'Checkbox'
  },{
    name : 'hidden',
    value : 'Hidden'
  }];

  $scope.newField = newField();

  function newField() {
    return {
      title : "New field",
      type : $scope.fieldTypes[0].name,
      value : "",
      required : false,
      choices: []
    };
  }

  // accordion settings
  $scope.accordion = {}
  $scope.accordion.oneAtATime = true;
  $scope.variants = [];

  $scope.deletableField = function(field) {
    return field.name.indexOf('field') != -1;
  }

  // create new field button click
  $scope.addNewField = function() {
    // put newField into fields array
    var fields = $scope.event.form.fields;
    var id = _.max(fields, function(field) { return field.id; }).id + 1;

    $scope.newField.id = id;
    $scope.newField.name = "field" + id;
    $scope.onRequiredChanged($scope.newField);
    fields.push($scope.newField);

    $scope.newField = newField();
  }

  $scope.moveFieldUp = function(e, fieldToMoveUp) {
    e.stopPropagation();

    // find first non-archived field above me
    // and switch our ids to re-order
    var sortedFields = _.sortBy($scope.event.form.fields, function(field) {
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

  $scope.moveFieldDown = function(e, fieldToMoveDown) {
    e.stopPropagation();

    // find the first non-archived field below me
    // and switch our ids to re-order
    var sortedFields = _.sortBy($scope.event.form.fields, function(field) {
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

  var debouncedAutoSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saving = false;
      $scope.event.$save({populate: false}, function() {
        formSaved = true;
        completeSave();
      });
    });
  }, 1000);

  $scope.$on('uploadComplete', function(event, args) {
    $scope.savedTime = Date.now();
  });

  $scope.groupLayerByType = function (layer) {
    return layer.type;
  }

  $scope.saveForm = function() {
    formSaved = false;
    $scope.saving = true;
    $scope.uploadIcons = true;
    debouncedAutoSave();
  }

  function completeSave() {
     if (unsavedIcons == 0 && formSaved) {
       $scope.saving = false;
       $scope.unSavedChanges = false;
       $scope.uploadIcons = false;
     }
  }

  $scope.populateVariants = function() {
    if (!$scope.event.form) return;

    $scope.variantField = _.find($scope.event.form.fields, function(field) {
      return field.name == $scope.event.form.variantField;
    });

    if (!$scope.variantField) {
      // they do not want a variant
      $scope.variants = [];
      $scope.event.form.variantField = null;

      return;
    }
    if ($scope.variantField.type == 'dropdown') {
      $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
      $scope.showNumberVariants = false;
    } else if ($scope.variantField.type == 'date') {
      $scope.variantField.choices = $scope.variantField.choices || [];
      $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
      $scope.showNumberVariants = true;
    }
  }

  $scope.$watch('event.form.variantField', function(variantField) {
    if (!variantField) return;

    $scope.populateVariants();
  });

  $scope.$watch('event.form.fields', function() {
    if (!$scope.event || !$scope.event.form || !$scope.event.form.fields) return;

    angular.forEach($scope.event.form.fields, function(field) {
      if (field.name == 'type') {
        $scope.typeField = field;
      }
    });
  });

  $scope.$on('uploadFile', function(e, uploadFile) {
    $scope.event.formArchiveFile = uploadFile;
  });

  $scope.variantChanged = function() {
    $scope.populateVariants();
  }

  // deletes particular field on button click
  $scope.deleteField = function (id) {
    var deletedField = _.find($scope.event.form.fields, function(field) { return id == field.id});
    if (deletedField) {
      deletedField.archived = true;
      $scope.populateVariants();
    }
  }

  $scope.variantFilter = function(field) {
    return (field.type == 'dropdown' || field.type == 'date') && field.name != 'type';
  }

  $scope.removeVariant = function(variant) {
    $scope.variantField.choices = _.without($scope.variantField.choices, variant);
    $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
  }

  $scope.addVariantOption = function(min, max) {
    var newOption = {
      "id" : $scope.variantField.choices.length,
      "title" : min,
      "value" : min
    };

    $scope.variantField.choices = $scope.variantField.choices || new Array();
    $scope.variantField.choices.push(newOption);
    $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
  }

  $scope.addType = function() {
    $scope.addOption($scope.typeField);
    if ($scope.event.id) { $scope.event.$save(); }
  }

  // add new option to the field
  $scope.addOption = function (field, optionTitle) {
    field.choices = field.choices || new Array();
    field.choices.push({
      "id" : field.choices.length,
      "title" : optionTitle,
      "value" : field.choices.length
    });

    $scope.populateVariants();
  }

  // delete particular option
  $scope.deleteOption = function (field, option) {
    for (var i = 0; i < field.choices.length; i++) {
      if(field.choices[i].id == option.id) {
        field.choices.splice(i, 1);
        break;
      }
    }
    $scope.populateVariants();
  }

  $scope.onRequiredChanged = function(field) {
    if (field.type == 'dropdown') {
      if (field.required && field.choices.length && field.choices[0].blank) {
        field.choices.shift();

        _.each(field.choices, function(choice) {
          choice.id = choice.id - 1;
          choice.value = choice.value - 1;
        });
      } else if (!field.required && field.choices.length > 0  && !field.choices[0].blank) {
        // add empty field
        _.each(field.choices, function(choice) {
          choice.id = choice.id + 1;
          choice.value = choice.value + 1;
        });

        field.choices.unshift({
          id: 0,
          title: "",
          value: 0,
          blank: true
        });
      }
    }
  }

  // decides whether field options block will be shown (true for dropdown and radio fields)
  $scope.showAddOptions = function (field) {
    return (field.type == "radio" || field.type == "dropdown");
  }

  var disableLocationChangeStart = $rootScope.$on("$locationChangeStart", function(event, next, current) {
    if ($scope.unSavedChanges) {
      event.preventDefault();

      var modalInstance = $modal.open({
        templateUrl: '/app/admin/events/event.edit.form.unsaved.html'
      });

      modalInstance.result.then(function(result) {
        if (result == 'ok') {
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
