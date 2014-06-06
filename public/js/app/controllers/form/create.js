'use strict';

angular.module('mage').controller('CreateCtrl', function ($scope, appConstants, FormService, Layer, Form, $filter, $timeout, ObservationService) {

    // preview form mode
    $scope.previewMode = false;

    $scope.fs = FormService;
    $scope.saveTime = 0;

    $scope.form = FormService.editForm;

    $scope.fileUploadOptions = {
    };

    if ($scope.form) {
        angular.forEach($scope.form.fields, function(field) {
            if (field.title == 'Type') {
                $scope.typeField = field;
            }
        });
    }

    $scope.$watch('fs.editForm', function(newForm, oldForm){
        $scope.form = FormService.editForm;
        if ($scope.form) {
            angular.forEach($scope.form.fields, function(field) {
                if (field.title == 'Type') {
                    $scope.typeField = field;
                }
            });
         }
    });

    // previewForm - for preview purposes, form will be copied into this
    // otherwise, actual form might get manipulated in preview mode
    $scope.previewForm = {};

    $scope.fieldTypes = FormService.fields;
    $scope.newField = {
        "title" : "New field",
        "type" : $scope.fieldTypes[0].name,
        "value" : "",
        "required" : true
    };

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

        var id = $scope.form.fields[$scope.form.fields.length-1].id + 1;

        $scope.newField.id = id;
        $scope.newField.name = "field" + id;
        $scope.form.fields.push($scope.newField);

        $scope.newField = {
            "title" : "New field",
            "type" : $scope.fieldTypes[0].name,
            "value" : "",
            "required" : true
        };

        $scope.autoSave();
    }

    var debounceHideSave = _.debounce(function() {
      $scope.$apply(function() {
        $scope.saved = false;
      });
    }, 5000);

    var debouncedAutoSave = _.debounce(function() {
      $scope.$apply(function() {
        if ($scope.form.id) {
          $scope.form.$save({}, function() {
            $scope.saved = true;
            ObservationService.updateForm();
            $timeout(function() {
              debounceHideSave();
            });
          });
        }
      });
    }, 1000);

    $scope.$on('uploadComplete', function(event, args) {
      $scope.savedTime = Date.now();
    });

    $scope.autoSave = function() {
      debouncedAutoSave();
    }

    $scope.populateVariants = function(doNotAutoSave) {
      if (!$scope.form) return;

      if (!$scope.variantField) {
        // they do not want a variant
        $scope.variants = [];
        $scope.form.variantField = null;
        if (!doNotAutoSave) {
          $scope.autoSave();
        }
        return;
      }
      $scope.form.variantField = $scope.variantField.name;
      if ($scope.variantField.type == 'dropdown') {
        $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
        $scope.showNumberVariants = false;
      } else if ($scope.variantField.type == 'date') {
        $scope.variantField.choices = $scope.variantField.choices || [];
        $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
        $scope.showNumberVariants = true;
      }
      if (!doNotAutoSave) {
        $scope.autoSave();
      }
    }

    $scope.$watch('form', function() {
      if (!$scope.form) return;
      $scope.variantField = _.find($scope.form.fields, function(field) {
        return field.name == $scope.form.variantField;
      });
      $scope.populateVariants(true);
    });

    //$scope.$watch('variantField', $scope.populateVariants);

    // deletes particular field on button click
    $scope.deleteField = function (id){
        for(var i = 0; i < $scope.form.fields.length; i++){
            if($scope.form.fields[i].id == id){
                $scope.form.fields.splice(i, 1);
                break;
            }
        }
        $scope.autoSave();
    }

    $scope.variantFilter = function(field) {
      return (field.type == 'dropdown' || field.type == 'date') && field.name != 'type';
    }

    // add new option to the field
    $scope.addOption = function (field, optionTitle){
      field.choices = field.choices || new Array();
      field.choices.push({
          "id" : field.choices.length,
          "title" : optionTitle,
          "value" : field.choices.length
      });
      $scope.autoSave();
    }

    $scope.removeVariant = function(variant) {
      $scope.variantField.choices = _.without($scope.variantField.choices, variant);
      $scope.variants = $filter('orderBy')($scope.variantField.choices, 'value');
      $scope.autoSave();
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
      $scope.autoSave();
    }

    $scope.addType = function() {
        $scope.addOption($scope.typeField);
        if ($scope.form.id) { $scope.form.$save(); }
    }

    // delete particular option
    $scope.deleteOption = function (field, option){
        for(var i = 0; i < field.choices.length; i++){
            if(field.choices[i].id == option.id){
                field.choices.splice(i, 1);
                break;
            }
        }
        $scope.autoSave();
    }

    // preview form
    $scope.previewOn = function(){
        if($scope.form.fields == null || $scope.form.fields.length == 0) {
            var title = 'Error';
            var msg = 'No fields added yet, please add fields to the form before preview.';
            var btns = [{result:'ok', label: 'OK', cssCl***REMOVED***: 'btn-primary'}];

            //$modal.messageBox(title, msg, btns).open();

        }
        else {
            $scope.previewMode = true;
            angular.copy($scope.form, $scope.previewForm);
        }
    }

    // hide preview form, go back to create mode
    $scope.previewOff = function(){
        $scope.previewMode = false;
    }

    // decides whether field options block will be shown (true for dropdown and radio fields)
    $scope.showAddOptions = function (field){
        if(field.type == "radio" || field.type == "dropdown")
            return true;
        else
            return false;
    }

    // deletes all the fields
    $scope.reset = function (){
        $scope.form.fields.splice(0, $scope.form.fields.length);
    }

    $scope.saveForm = function() {
        $scope.form.$save();
    }

    $scope.useForm = function(form) {
      $scope.form.$save({}, function(savedForm) {
        $scope.setFeatureForm(form);
      });
    }

    $scope.setFeatureForm = function(form) {
      var layers = Layer.query(function(){
        angular.forEach(layers, function (layer) {
          if (layer.type == 'Feature') {
            layer.formId = form.id;
            layer.$save({}, function() {
              appConstants.formId = form.id;
              ObservationService.updateForm();
            });
          }
        });
      });
    }
});
