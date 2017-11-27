angular
  .module('mage')
  .controller('AdminEventEditFormController', AdminEventEditFormController);

AdminEventEditFormController.$inject = ['$rootScope', '$scope', '$location', '$filter', '$routeParams', '$q', '$timeout', '$uibModal', 'LocalStorageService', 'EventService', 'Event', 'Form'];

function AdminEventEditFormController($rootScope, $scope, $location, $filter, $routeParams, $q, $timeout, $uibModal, LocalStorageService, EventService, Event, Form) {
  $scope.unSavedChanges = false;
  $scope.unSavedUploads = false;
  $scope.token = LocalStorageService.getToken();

  var formSaved = false;
  var unsavedIcons = 0;
  $scope.uploadIcons = false;
  $scope.filesToUpload = {};
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
  });

  $scope.$watch('form', function(newForm, oldForm) {
    if (!newForm || !oldForm) return;

    if ($scope.saving) return;

    if (newForm.id && !oldForm.id) {
      $location.path('/admin/events/' + $scope.event.id + '/forms/' + newForm.id);
      return;
    }

    $scope.unSavedChanges = true;
  }, true);

  $scope.$watchCollection('filesToUpload', function() {
    if ($scope.filesToUpload && Object.keys($scope.filesToUpload).length > 0) {
      unsavedIcons = Object.keys($scope.filesToUpload).length;
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

  var debouncedAutoSave = _.debounce(function() {
    $scope.$apply(function() {
      for (var url in $scope.filesToUpload) {
        var file = $scope.filesToUpload[url];
        upload(url, file);
      }

      $scope.form.$save({eventId: $scope.event.id, id: $scope.form.id}, function() {
        _.each($scope.form.fields, function(field) {
          if ($scope.isMemberField(field)) {
            field.choices = [];
          }
        });
        $scope.saving = false;
        formSaved = true;
        completeSave();
      });
    });
  }, 1000);

  var upload = function(url, file) {

    var formData = new FormData();
    formData.append('icon', file);

    $.ajax({
      url: url,
      type: 'POST',
      xhr: function() {
        var myXhr = $.ajaxSettings.xhr();
        return myXhr;
      },
      success: function() {
        $scope.$apply(function(){
          delete $scope.filesToUpload[url];
          unsavedIcons--;
          completeSave();
          $scope.savedTime = Date.now();
        });
      },
      // error: uploadFailed,
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    });
  };

  $scope.$on('uploadComplete', function() {
    $scope.savedTime = Date.now();
  });

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
    $scope.uploadIcons = true;
    debouncedAutoSave();
  };

  function completeSave() {
    if (unsavedIcons === 0 && formSaved) {
      $scope.saving = false;
      $scope.unSavedChanges = false;
      $scope.uploadIcons = false;
      delete $scope.exportError;
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

      return;
    }

    if (!$scope.variantField) {
      // they do not want a variant
      $scope.variants = [];
      $scope.form.variantField = null;

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

  $scope.$on('uploadFile', function(e, uploadFile) {
    // TODO what is this?
    $scope.event.formArchiveFile = uploadFile;
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
    $scope.form.style = $scope.form.style || angular.copy($scope.event.style);

    var eventId = $scope.event.id;
    var formId = $scope.form.id;
    var token = $scope.token;
    var style = $scope.form.style;
    var filesToUpload = $scope.filesToUpload;

    if (primary && $scope.form.style) {
      $scope.form.style[primary] = $scope.form.style[primary] || {
        fill: $scope.form.style.fill,
        stroke: $scope.form.style.stroke,
        fillOpacity: $scope.form.style.fillOpacity,
        strokeOpacity: $scope.form.style.strokeOpacity,
        strokeWidth: $scope.form.style.strokeWidth
      };
      style = $scope.form.style[primary];
    }
    if (variant && $scope.form.style) {
      $scope.form.style[primary][variant] = $scope.form.style[primary][variant] || {
        fill: $scope.form.style[primary].fill,
        stroke: $scope.form.style[primary].stroke,
        fillOpacity: $scope.form.style[primary].fillOpacity,
        strokeOpacity: $scope.form.style[primary].strokeOpacity,
        strokeWidth: $scope.form.style[primary].strokeWidth
      };
      style = $scope.form.style[primary][variant];
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
      scope: $scope,
      size: 'lg',
      controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
        var fileToUpload;
        $scope.model = {
          primary: primary,
          variant: variant,
          style: styleProps
        };
        $scope.minicolorSettings = {
          position: 'bottom left'
        };
        $scope.uploadUrl = '/api/events/' + eventId + '/icons' + (formId ? '/' + formId : '') + (primary ? '/' + primary : '') + (variant ? '/' + variant : '')  + '?access_token=' + token;

        $scope.$on('uploadFile', function(e, uploadId, file) {
          fileToUpload = file;
        });

        $scope.done = function() {
          $scope.styleForm.$submitted = true;
          if ($scope.styleForm.$invalid) {
            return;
          }

          $uibModalInstance.close({style:$scope.model.style, file: fileToUpload, uploadUrl: $scope.uploadUrl});
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss({reason:'cancel', url:$scope.uploadUrl});
        };
      }]
    });

    modalInstance.result.then(function (result) {
      var updatedStyle = result.style;
      var file = result.file;
      var url = result.uploadUrl;

      style.fill = updatedStyle.fill;
      style.stroke = updatedStyle.stroke;
      style.fillOpacity = updatedStyle.fillOpacity;
      style.strokeOpacity = updatedStyle.strokeOpacity;
      style.strokeWidth = updatedStyle.strokeWidth;

      if (result.file) {
        var reader = new FileReader();

        reader.onload = (function() {
          return function(e) {
            $scope.uploadImageMissing = false;
            $scope.$apply();
            var img = $('img[src*="' + url + '"]').first();
            img.attr('src',e.target.result);
          };
        })(file);

        reader.readAsDataURL(file);
      }
    }, function(result) {
      // rejected
      delete filesToUpload[result.url];
    });
  };

  $scope.$on('uploadFile', function(e, uploadId, file, url) {
    $scope.filesToUpload[url] = file;
  });

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
