var _ = require('underscore')
  , $ = require('jquery')
  , angular = require('angular');

module.exports = AdminEventEditFormController;

AdminEventEditFormController.$inject = ['$rootScope', '$scope', '$location', '$filter', '$routeParams', '$q', '$timeout', '$uibModal', 'LocalStorageService', 'EventService', 'Event', 'Form', 'FormIcon'];

function AdminEventEditFormController($rootScope, $scope, $location, $filter, $routeParams, $q, $timeout, $uibModal, LocalStorageService, EventService, Event, Form, FormIcon) {
  $scope.unSavedChanges = false;
  $scope.unSavedUploads = false;
  $scope.token = LocalStorageService.getToken();

  var icons = {};
  $scope.iconMap = {};
  $scope.styleMap = {};

  var formSaved = false;
  $scope.filesToUpload = [];
  $scope.saveTime = 0;

  Event.get({id: $routeParams.eventId}, function(event) {
    $scope.event = event;

    if ($routeParams.formId) {
      var form = _.find(event.forms, function(form) {
        return form.id.toString() === $routeParams.formId;
      });
      $scope.form = new Form(form);

      _.each($scope.form.fields, function(field) {
        if (field.name === $scope.form.primaryField) {
          $scope.primaryField = field;
        }
      });
    } else {
      $scope.form = new Form();
      $scope.form.archived = false;
      $scope.form.color = '#' + (Math.random()*0xFFFFFF<<0).toString(16);
      $scope.form.fields = [];
      $scope.form.userFields = [];
    }

    mapStyles();
    fetchIcons($routeParams.eventId, $routeParams.formId);
  });

  function fetchIcons() {
    if (!$routeParams.formId) {
      FormIcon.get({eventId: $routeParams.eventId}, function(icon) {
        icons = icon;
        mapIcons();
      });
    } else {
      FormIcon.query({eventId: $routeParams.eventId, formId: $routeParams.formId || 'new'}, function(formIcons) {
        _.each(formIcons, function(icon) {
          if (icon.primary && icon.variant) {
            if (!icons[icon.primary]) {
              icons[icon.primary] = {};
            }

            icons[icon.primary][icon.variant] = _.extend(icons[icon.primary][icon.variant] || {}, icon);
          } else if (icon.primary) {
            icons[icon.primary] = _.extend(icons[icon.primary] || {}, icon);
          } else {
            icons = icon;
          }
        });

        mapIcons();
      });
    }
  }

  $scope.$watch('form', function(newForm, oldForm) {
    if (!newForm || !oldForm) return;

    if ($scope.saving) return;

    if (!newForm.id || oldForm.id) {
      $scope.unSavedChanges = true;
    }

  }, true);

  $scope.$watchCollection('filesToUpload', function() {
    if ($scope.filesToUpload && $scope.filesToUpload.length > 0) {
      $scope.unSavedUploads = true;
    } else {
      if (!$scope.saving) {
        $scope.unSavedChanges = false;
      }
      $scope.unSavedUploads = false;
    }
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

  function mapIcons() {
    if ($scope.primaryField) {
      _.each($scope.primaryField.choices, function(primary) {
        $scope.iconMap[primary.title] = {
          icon: getIcon(primary.title)
        };

        _.each($scope.variants, function(variant) {
          $scope.iconMap[primary.title][variant.title] = {
            icon: getIcon(primary.title, variant.title)
          };
        });
      });
    }

    $scope.iconMap.icon = getIcon();
  }

  function getIcon(primary, variant) {
    if (primary && icons[primary] && variant && icons[primary][variant] && icons[primary][variant].icon) {
      return icons[primary][variant].icon;
    } else if (primary && icons[primary] && icons[primary].icon) {
      return icons[primary].icon;
    } else {
      return icons.icon;
    }
  }

  function mapStyles() {
    if ($scope.primaryField) {
      _.each($scope.primaryField.choices, function(primary) {
        $scope.styleMap[primary.title] = {
          style: getStyle(primary.title)
        };

        _.each($scope.variants, function(variant) {
          $scope.styleMap[primary.title][variant.title] = {
            style: getStyle(primary.title, variant.title)
          };
        });
      });
    }

    $scope.styleMap.style = getStyle();
  }

  var styleKeys = ['fill', 'fillOpacity', 'stroke', 'strokeOpacity', 'strokeWidth'];
  function getStyle(primary, variant) {
    if (!$scope.event || !$scope.form) return;

    var style = $scope.form.style || $scope.event.style;

    if (primary && style[primary] && variant && style[primary][variant]) {
      return _.pick(style[primary][variant], styleKeys);
    } else if (primary && style[primary]) {
      return _.pick(style[primary], styleKeys);
    } else {
      return _.pick(style, styleKeys);
    }
  }

  $scope.onIconAdded = function(event) {
    var icon = event.icon;
    var primary = event.primary;
    var variant = event.varaint;

    this.filesToUpload.push({
      file: event.file,
      primary: primary,
      variant: variant
    });

    if (primary && variant) {
      icons[primary] = icons[primary] || {};
      icons[primary][variant] = _.extend(icons[primary][variant] || {}, {icon: icon});

      $scope.iconMap[primary][variant].icon = getIcon(primary, variant);
    } else if (primary) {
      icons[primary] = _.extend(icons[primary] || {}, {icon: icon});

      _.each($scope.variants, function(variant) {
        $scope.iconMap[primary][variant.title].icon = getIcon(primary, variant.title);
      });
    } else {
      icons = _.extend(icons || {}, {icon: icon});

      if ($scope.primaryField) {
        _.each($scope.primaryField.choices, function(primary) {
          _.each($scope.variants, function(variant) {
            $scope.iconMap[primary.title][variant.title].icon = getIcon(primary.title, variant.title);
          });

          $scope.iconMap[primary.title].icon = getIcon(primary.title);
        });
      }
    }
  };

  $scope.onStyleChanged = function(event) {
    var style = event.style;
    var primary = event.primary;
    var variant = event.variant;

    $scope.form.style = $scope.form.style || angular.copy($scope.event.style);

    if (primary && variant) {
      if (!$scope.form.style[primary]) {
        $scope.form.style[primary] = angular.copy($scope.form.style);
      }
      $scope.form.style[primary][variant] = _.extend($scope.form.style[primary][variant] || {}, style);

      $scope.styleMap[primary][variant.title].style = getStyle(primary, variant.title);
    } else if (primary) {
      $scope.form.style[primary] = _.extend($scope.form.style[primary] || {}, style);

      _.each($scope.variants, function(variant) {
        $scope.styleMap[primary][variant.title].style = getStyle(primary, variant.title);
      });
    } else {
      $scope.form.style = _.extend($scope.form.style || {}, style);
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
      });
    });
  }, 1000);

  function upload(fileUpload) {
    var url = '/api/events/' + $scope.event.id + '/icons/' + $scope.form.id +
      (fileUpload.primary ? '/' + fileUpload.primary : '') +
      (fileUpload.variant ? '/' + fileUpload.variant : '');

    var formData = new FormData();
    formData.append('icon', fileUpload.file);

    $.ajax({
      url: url,
      type: 'POST',
      headers: {
        'Authorization':'Bearer ' + LocalStorageService.getToken(),
      },
      xhr: function() {
        var myXhr = $.ajaxSettings.xhr();
        return myXhr;
      },
      success: function() {
        $scope.$apply(function() {
          $scope.filesToUpload = _.reject($scope.filesToUpload, function(upload) {
            return fileUpload.file === upload.file;
          });
          completeSave();
        });
      },
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    });
  }

  $scope.groupLayerByType = function (layer) {
    return layer.type;
  };

  $scope.archiveForm = function() {
    $scope.form.archived = true;
    $scope.form.$save({eventId: $scope.event.id, id: $scope.form.id}, function() {
    });
  };

  $scope.restoreForm = function() {
    $scope.form.archived = false;
    $scope.form.$save({eventId: $scope.event.id, id: $scope.form.id}, function() {
    });
  };

  $scope.saveForm = function() {
    $scope.generalForm.$submitted = true;

    var unarchivedFields = _.filter($scope.form.fields, function(field) {
      return !field.archived;
    });
    if ($scope.generalForm.$invalid || _.isEmpty(unarchivedFields)) {
      return;
    }

    formSaved = false;
    $scope.saving = true;
    debouncedAutoSave();
  };

  function completeSave() {
    if ($scope.filesToUpload.length === 0 && formSaved) {
      $scope.saving = false;
      $scope.unSavedChanges = false;
      delete $scope.exportError;

      if ($location.path().indexOf('/forms/new') !== -1) {
        $location.path('/admin/events/' + $scope.event.id + '/forms/' + $scope.form.id);
        return;
      }

      fetchIcons();
      mapStyles();
    }
  }

  $scope.populateVariants = function() {
    // TODO account for primary variantField

    if (!$scope.form) return;

    $scope.primaryField = _.find($scope.form.fields, function(field) {
      return field.name === $scope.form.primaryField;
    });

    $scope.variantField = _.find($scope.form.fields, function(field) {
      return field.name === $scope.form.variantField;
    });

    if (!$scope.primaryField) {
      $scope.variants = [];
      $scope.form.primaryField = null;
      $scope.form.variantField = null;
      mapIcons();
      mapStyles();

      return;
    }

    if (!$scope.variantField) {
      // they do not want a variant
      $scope.variants = [];
      $scope.form.variantField = null;
      mapIcons();
      mapStyles();

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

    mapIcons();
    mapStyles();
  };

  $scope.$watch('form.primaryField', function(primaryField) {
    if (!primaryField) return;

    $scope.populateVariants();
  });

  $scope.$watch('form.variantField', function(variantField) {
    if (!variantField) return;

    $scope.populateVariants();
  });

  $scope.$watch('form.fields', function() {
    if (!$scope.form || !$scope.form.fields) return;

    angular.forEach($scope.form.fields, function(field) {
      if (field.name === $scope.form.primaryField) {
        $scope.primaryField = field;
      }
    });
  });

  $scope.primaryChanged = function() {
    $scope.populateVariants();
  };

  $scope.variantChanged = function() {
    $scope.populateVariants();
  };

  // deletes particular field on button click
  $scope.deleteField = function (id) {
    var deletedField = _.find($scope.form.fields, function(field) { return id === field.id; });
    if (deletedField) {
      deletedField.archived = true;
      $scope.populateVariants();
    }
  };

  $scope.symbologyFilter = function(otherFilterField) {
    return function(field) {
      return !field.archived && field.type === 'dropdown' && (!otherFilterField || otherFilterField.name !== field.name);
    };
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
