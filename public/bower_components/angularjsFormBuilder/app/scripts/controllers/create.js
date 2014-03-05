'use strict';

angular.module('angularjsFormBuilderApp').controller('CreateCtrl', function ($scope, FormService) {

    // preview form mode
    $scope.previewMode = false;

    // new form
    $scope.form = {};
    $scope.form.id = 1;
    $scope.form.name = 'My Form';
    $scope.form.fields = [];

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

        // incr id counter
        $scope.addField.lastAddedID++;

        var newField = {
            "id" : $scope.addField.lastAddedID,
            "title" : "New field - " + ($scope.addField.lastAddedID),
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
        if(!field.options)
            field.options = new Array();

        var lastOptionID = 0;

        if(field.options[field.options.length-1])
            lastOptionID = field.options[field.options.length-1].id;

        // new option's id
        var id = lastOptionID + 1;

        var newOption = {
            "id" : id,
            "title" : "Option " + id,
            "value" : id
        };

        // put new option into field_options array
        field.options.push(newOption);
    }

    // delete particular option
    $scope.deleteOption = function (field, option){
        for(var i = 0; i < field.options.length; i++){
            if(field.options[i].id == option.id){
                field.options.splice(i, 1);
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
            $scope.previewMode = !$scope.previewMode;
            $scope.form.submitted = false;
            angular.copy($scope.form, $scope.previewForm);
        }
    }

    // hide preview form, go back to create mode
    $scope.previewOff = function(){
        $scope.previewMode = !$scope.previewMode;
        $scope.form.submitted = false;
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
});
