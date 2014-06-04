'use strict';

angular.module('mage').controller('CreateCtrl', function ($scope, appConstants, FormService, Layer, Form, $filter) {

    // preview form mode
    $scope.previewMode = false;

    $scope.fs = FormService;

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
        $scope.newField.id = $scope.form.fields.length+1;
        $scope.newField.name = "field" + ($scope.form.fields.length+1);
        $scope.form.fields.push($scope.newField);
        
        $scope.newField = {
            "title" : "New field",
            "type" : $scope.fieldTypes[0].name,
            "value" : "",
            "required" : true
        };
    }

    $scope.populateVariants = function() {
      if (!$scope.form) return;

      if (!$scope.variantField) {
        // they do not want a variant
        $scope.variants = [];
        $scope.form.variantField = null;
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
    }

    $scope.$watch('form', function() {
      if (!$scope.form) return;
      console.log('form changed');
      $scope.variantField = _.find($scope.form.fields, function(field) {
        return field.name == $scope.form.variantField;
      });
    });

    $scope.$watch('variantField', $scope.populateVariants);

    // deletes particular field on button click
    $scope.deleteField = function (id){
        for(var i = 0; i < $scope.form.fields.length; i++){
            if($scope.form.fields[i].id == id){
                $scope.form.fields.splice(i, 1);
                break;
            }
        }
        if ($scope.form.id) { $scope.form.$save(); }
    }

    $scope.variantFilter = function(field) {
      return (field.type == 'dropdown' || field.type == 'date') && field.name != 'type';
    }

    // add new option to the field
    $scope.addOption = function (field){
        if(!field.choices)
            field.choices = new Array();

        var lastOptionID = 0;

        if(field.choices[field.choices.length-1])
            lastOptionID = field.choices[field.choices.length-1].id;

        // new option's id
        var id = lastOptionID + 1;

        var newOption = {
            "id" : id,
            "title" : "Option " + id,
            "value" : id
        };

        // put new option into field_options array
        field.choices.push(newOption);
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
    }

    // delete particular option
    $scope.deleteOption = function (field, option){
        for(var i = 0; i < field.choices.length; i++){
            if(field.choices[i].id == option.id){
                field.choices.splice(i, 1);
                break;
            }
        }
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
            layer.$save();
            appConstants.formId = form.id;
          }
        });
      });
    }
});
