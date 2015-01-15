'use strict';

angular.module('mage').controller('EventCtrl', function ($scope, $injector, appConstants, EventService, Layer, Event, $filter, $timeout, ObservationService) {

    // preview form mode
    $scope.previewMode = false;

    $scope.es = EventService;
    $scope.saveTime = 0;

    $scope.event = EventService.editEvent;

    $scope.fileUploadOptions = {
    };

    $scope.$watch('es.editEvent', function(newEvent, oldEvent) {
        $scope.event = EventService.editEvent;
        if ($scope.event && $scope.event.form) {
            angular.forEach($scope.event.form.fields, function(field) {
                if (field.name == 'type') {
                    $scope.typeField = field;
                }
            });
         }
    });

    // previewForm - for preview purposes, form will be copied into this
    // otherwise, actual form might get manipulated in preview mode
    $scope.previewEvent = {};

    $scope.fieldTypes = EventService.form.fields;
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

        var id = $scope.event.form.fields[$scope.form.fields.length-1].id + 1;

        $scope.newField.id = id;
        $scope.newField.name = "field" + id;
        $scope.event.form.fields.push($scope.newField);

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
        if ($scope.event.id) {
          $scope.event.$save({}, function() {
            $scope.saved = true;
            $timeout(function() {
              debounceHideSave();
            });
            console.log($scope.event);
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
      if (!$scope.event.form) return;
      $scope.variantField = _.find($scope.event.form.fields, function(field) {
        return field.name == $scope.event.form.variantField;
      });
      if (!$scope.variantField) {
        // they do not want a variant
        $scope.variants = [];
        $scope.event.form.variantField = null;
        if (!doNotAutoSave) {
          $scope.autoSave();
        }
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
      if (!doNotAutoSave) {
        $scope.autoSave();
      }
    }

    $scope.$watch('event', function() {
      if (!$scope.event) return;

      $scope.populateVariants(true);
    });

    $scope.$watch('event.form.fields', function() {
      if (!$scope.event || !$scope.event.form || !$scope.event.form.fields) return;
      angular.forEach($scope.event.form.fields, function(field) {
          if (field.name == 'type') {
              $scope.typeField = field;
          }
      });
    });

    $scope.$watch('event.form.variantField', function(newValue, oldValue) {
      if (!$scope.event || !$scope.event.form || newValue == oldValue) return;
      $scope.populateVariants()
    });

    $scope.$on('uploadFile', function(e, uploadFile) {
      $scope.event.formArchiveFile = uploadFile;
    });

    // deletes particular field on button click
    $scope.deleteField = function (id) {
      var deletedField = _.find($scope.event.form.fields, function(field) { return id == field.id});
      if (deletedField) {
        deletedField.archived = true;
        $scope.populateVariants();
        $scope.autoSave();
      }
    }

    $scope.variantFilter = function(field) {
      return (field.type == 'dropdown' || field.type == 'date') && field.name != 'type';
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
        if ($scope.event.id) { $scope.event.$save(); }
    }

    // delete particular option
    $scope.deleteOption = function (field, option){
        for(var i = 0; i < field.choices.length; i++){
            if(field.choices[i].id == option.id){
                field.choices.splice(i, 1);
                break;
            }
        }
        $scope.populateVariants();
        $scope.autoSave();
    }

    // preview form
    $scope.previewOn = function(){
        if($scope.event.form.fields == null || $scope.event.form.fields.length == 0) {
            var title = 'Error';
            var msg = 'No fields added yet, please add fields to the form before preview.';
            var btns = [{result:'ok', label: 'OK', cssCl***REMOVED***: 'btn-primary'}];

            //$modal.messageBox(title, msg, btns).open();

        }
        else {
            $scope.previewMode = true;
            angular.copy($scope.event.form, $scope.previewEvent);
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
    $scope.reset = function() {
        $scope.event.form.fields.splice(0, $scope.event.form.fields.length);
    }

    $scope.saveEvent = function() {
        $scope.event.$save();
    }

    $scope.createEvent = function() {
      $scope.event.$save();
    }

    $scope.deleteEvent= function() {
      var modalInstance = $injector.get('$modal').open({
        templateUrl: 'deleteEvent.html',
        resolve: {
          event: function () {
            return $scope.event;
          }
        },
        controller: function ($scope, $modalInstance, event) {
          $scope.event = event;

          $scope.deleteEvent = function(event, force) {
            console.info('delete event');
            event.$delete(function(success) {
              console.info('event delete success');
              $modalInstance.close(form);
            });
          }
          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      });

      modalInstance.result.then(function (event) {
        console.info('success');
        $scope.event = null;
        $scope.removEvent(event);
      }, function () {
        console.info('failure');
      });
      return;
    }
});
