angular
  .module('mage')
  .controller('AdminEventEditFormController', AdminEventEditFormController);

AdminEventEditFormController.$inject = ['$rootScope', '$scope', '$location', '$filter', '$routeParams', '$q', '$timeout', '$uibModal', 'LocalStorageService', 'EventService', 'Event'];

function AdminEventEditFormController($rootScope, $scope, $location, $filter, $routeParams, $q, $timeout, $uibModal, LocalStorageService, EventService, Event) {
  $scope.unSavedChanges = false;
  $scope.token = LocalStorageService.getToken();

  var formSaved = false;
  var unsavedIcons = 0;
  $scope.uploadIcons = false;

  $scope.saveTime = 0;

  Event.get({id: $routeParams.eventId}, function(event) {
    $scope.event = event;

    _.each(event.form.fields, function(field) {
      if (field.name === 'type') {
        $scope.typeField = field;
      }
    });
  });

  $scope.$watch('event.form', function(newForm, oldForm) {
    if (!newForm || !oldForm) return;

    if ($scope.saving) return;

    $scope.unSavedChanges = true;
  }, true);

  $scope.$on('uploadFile', function() {
    $scope.unSavedChanges = true;

    unsavedIcons++;
  });

  $scope.$on('uploadComplete', function() {
    unsavedIcons--;
    completeSave();
  });

  $scope.fileUploadOptions = {};

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
    var fields = $scope.event.form.fields;
    var id = _.max(fields, function(field) { return field.id; }).id + 1;

    $scope.newField.id = id;
    $scope.newField.name =  'field' + id;

    if ($scope.newField.type === 'userDropdown') {
      $scope.event.form.userFields.push($scope.newField.name);
      $scope.newField.type = 'dropdown';
    }

    if ($scope.newField.type === 'dropdown' && $scope.newField.$multiselect) {
      $scope.newField.type = 'multiselectdropdown';
    }

    fields.push($scope.newField);

    $scope.newField = newField();
  };

  $scope.canMoveField = function(field) {
    return field.name !== 'type' &&
      field.name !== 'geometry' &&
      field.name !== 'timestamp' &&
      field !== $scope.variantField;
  };

  $scope.moveFieldUp = function(e, fieldToMoveUp) {
    e.stopPropagation();
    e.preventDefault();

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
  };

  $scope.moveFieldDown = function(e, fieldToMoveDown) {
    e.stopPropagation();
    e.preventDefault();

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
  };

  var debouncedAutoSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saving = false;
      $scope.event.$save({populate: false}, function(event) {
        _.each(event.form.fields, function(field) {
          if ($scope.isMemberField(field)) {
            field.choices = [];
          }
        });
        $scope.event = event;

        formSaved = true;
        completeSave();
      });
    });
  }, 1000);

  $scope.$on('uploadComplete', function() {
    $scope.savedTime = Date.now();
  });

  $scope.groupLayerByType = function (layer) {
    return layer.type;
  };

  $scope.saveForm = function() {
    formSaved = false;
    $scope.saving = true;
    $scope.uploadIcons = true;
    debouncedAutoSave();
  };

  function completeSave() {
    if (unsavedIcons === 0 && formSaved) {
      $scope.saving = false;
      $scope.unSavedChanges = false;
      $scope.uploadIcons = false;
    }
  }

  $scope.populateVariants = function() {
    if (!$scope.event.form) return;

    $scope.variantField = _.find($scope.event.form.fields, function(field) {
      return field.name === $scope.event.form.variantField;
    });

    if (!$scope.variantField) {
      // they do not want a variant
      $scope.variants = [];
      $scope.event.form.variantField = null;

      return;
    }
    if ($scope.variantField.type === 'dropdown') {
      $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
      $scope.showNumberVariants = false;
    } else if ($scope.variantField.type === 'date') {
      $scope.variantField.choices = $scope.variantField.choices || [];
      $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
      $scope.showNumberVariants = true;
    }
  };

  $scope.$watch('event.form.variantField', function(variantField) {
    if (!variantField) return;

    $scope.populateVariants();
  });

  $scope.$watch('event.form.fields', function() {
    if (!$scope.event || !$scope.event.form || !$scope.event.form.fields) return;

    angular.forEach($scope.event.form.fields, function(field) {
      if (field.name === 'type') {
        $scope.typeField = field;
      }
    });
  });

  $scope.$on('uploadFile', function(e, uploadFile) {
    $scope.event.formArchiveFile = uploadFile;
  });

  $scope.variantChanged = function() {
    $scope.populateVariants();
  };

  // deletes particular field on button click
  $scope.deleteField = function (id) {
    var deletedField = _.find($scope.event.form.fields, function(field) { return id === field.id; });
    if (deletedField) {
      deletedField.archived = true;
      $scope.populateVariants();
    }
  };

  $scope.variantFilter = function(field) {
    return (field.type === 'dropdown' || field.type === 'date') && field.name !== 'type';
  };

  $scope.removeVariant = function(variant) {
    $scope.variantField.choices = _.without($scope.variantField.choices, variant);
    $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
  };

  $scope.addVariantOption = function(min) {
    var newOption = {
      "id" : $scope.variantField.choices.length,
      "title" : min,
      "value" : min
    };

    $scope.variantField.choices = $scope.variantField.choices || new Array();
    $scope.variantField.choices.push(newOption);
    $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
  };

  $scope.addType = function() {
    $scope.addOption($scope.typeField);
    if ($scope.event.id) { $scope.event.$save(); }
  };

  // add new option to the field
  $scope.addOption = function (field, optionTitle) {
    field.choices = field.choices || new Array();
    field.choices.push({
      "id" : field.choices.length,
      "title" : optionTitle,
      "value" : field.choices.length
    });

    $scope.populateVariants();
  };

  $scope.reorderOption = function(field, option) {
    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/events/event.field.option.reorder.html',
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

  $scope.updateSymbology = function(primary, variant) {
    var eventId = $scope.event.id;
    var token = $scope.token;
    var style = $scope.event.form.style;

    if (primary) {
      $scope.event.form.style[primary] = $scope.event.form.style[primary] || {
        fill: $scope.event.form.style.fill,
        stroke: $scope.event.form.style.stroke,
        fillOpacity: $scope.event.form.style.fillOpacity,
        strokeOpacity: $scope.event.form.style.strokeOpacity,
        strokeWidth: $scope.event.form.style.strokeWidth
      };
      style = $scope.event.form.style[primary];
    }
    if (variant) {
      $scope.event.form.style[primary][variant] = $scope.event.form.style[primary][variant] || {
        fill: $scope.event.form.style[primary].fill,
        stroke: $scope.event.form.style[primary].stroke,
        fillOpacity: $scope.event.form.style[primary].fillOpacity,
        strokeOpacity: $scope.event.form.style[primary].strokeOpacity,
        strokeWidth: $scope.event.form.style[primary].strokeWidth
      };
      style = $scope.event.form.style[primary][variant];
    }

    var styleProps = {
      fill: style.fill,
      stroke: style.stroke,
      fillOpacity: style.fillOpacity,
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth
    };

    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/events/event.symbology.chooser.html',
      controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
        $scope.model = {
          primary: primary,
          variant: variant,
          style: styleProps
        };
        $scope.minicolorSettings = {
          position: 'bottom left'
        };
        $scope.uploadUrl = '/api/events/' + eventId + '/form/icons' + (primary ? '/' + primary : '') + (variant ? '/' + variant : '')  + '?access_token=' + token;

        $scope.done = function() {
          $scope.updateStyle = true;
          $uibModalInstance.close($scope.model.style);
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (updatedStyle) {
      style.fill = updatedStyle.fill;
      style.stroke = updatedStyle.stroke;
      style.fillOpacity = updatedStyle.fillOpacity;
      style.strokeOpacity = updatedStyle.strokeOpacity;
      style.strokeWidth = updatedStyle.strokeWidth;
    });
  }

  // delete particular option
  $scope.deleteOption = function (field, option) {
    for (var i = 0; i < field.choices.length; i++) {
      if(field.choices[i].id === option.id) {
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
    return _.contains($scope.event.form.userFields, field.name);
  };

  $scope.isUserDropdown = function(field) {
    return field.type === 'userDropdown';
  };

  var disableLocationChangeStart = $rootScope.$on("$locationChangeStart", function(event, next) {
    if ($scope.unSavedChanges) {
      event.preventDefault();

      var modalInstance = $uibModal.open({
        templateUrl: '/app/admin/events/event.edit.form.unsaved.html'
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
