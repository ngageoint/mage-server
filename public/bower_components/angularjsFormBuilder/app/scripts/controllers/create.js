'use strict';

angular.module('mage').controller('CreateCtrl', function ($scope, FormService, Layer) {

    // preview form mode
    $scope.previewMode = false;

    $scope.fs = FormService;

    $scope.form = FormService.editForm;

    $scope.fileUploadOptions = {
    };

    console.log("scope.form is ", $scope.form);
    if ($scope.form) {
        angular.forEach($scope.form.fields, function(field) {
            if (field.title == 'Type') {
                $scope.typeField = field;
            }
        });
    }

    $scope.$watch('fs.editForm', function(newForm, oldForm){
        console.log('form changed');
        $scope.form = FormService.editForm;
        console.log("scope.form now is ", $scope.form);
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

    // add new field drop-down:
    $scope.addField = {};
    $scope.addField.types = FormService.fields;
    $scope.addField.new = $scope.addField.types[0].name;
    $scope.addField.lastAddedID = 0;

    // accordion settings
    $scope.accordion = {}
    $scope.accordion.oneAtATime = true;

    // create new field button click
    $scope.addNewField = function(){

        var newField = {
            "id" : $scope.form.fields.length+1,
            "title" : "New field - " + ($scope.form.fields.length+1),
            "type" : $scope.addField.new,
            "value" : "",
            "required" : true
        };

        // put newField into fields array
        $scope.form.fields.push(newField);
    }

    // deletes particular field on button click
    $scope.deleteField = function (id){
        for(var i = 0; i < $scope.form.fields.length; i++){
            if($scope.form.fields[i].id == id){
                $scope.form.fields.splice(i, 1);
                break;
            }
        }
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
        $scope.addField.lastAddedID = 0;
    }

    $scope.createForm = function() {
        FormService.submitForm($scope.form);
    }

    $scope.useForm = function(form) {
        FormService.submitForm(form).then(function(savedForm) {
          if (!form.id) {
            form.id = savedForm.id;
            $scope.forms.push(form);
          }
          $scope.setFeatureForm(form);
        });
    }
    $scope.setFeatureForm = function(form) {
        var layers = Layer.query(function(){
            angular.forEach(layers, function (layer) {
              if (layer.type == 'Feature') {
                layer.formId = form.id;
                layer.$save();
                form.inUse = true;
                FormService.forms().then(function(forms) {
                    angular.forEach(forms, function(theForm) {
                        if (theForm.id != form.id) {
                            theForm.inUse = false;
                        }
                    });
                });
              }
            });
        });

    }
});
