var _ = require('underscore')
  , $ = require('jquery')
  , moment = require('moment')
  , angular = require('angular');

module.exports = AdminEventEditFormFeedController;

AdminEventEditFormFeedController.$inject = ['$rootScope', '$scope', '$location', '$filter', '$routeParams', '$q', '$timeout', '$uibModal', 'LocalStorageService', 'EventService', 'Event', 'Form', 'FormIcon', 'UserService'];

function AdminEventEditFormFeedController($rootScope, $scope, $location, $filter, $routeParams, $q, $timeout, $uibModal, LocalStorageService, EventService, Event, Form, FormIcon, UserService) {
  $scope.unSavedChanges = false;
  $scope.unSavedUploads = false;
  $scope.token = LocalStorageService.getToken();

  var fakeObservationFormFields = {
    "formId": Number($routeParams.formId)
  }
  
  var formSaved = false;
  $scope.filesToUpload = [];
  $scope.saveTime = 0;

  Event.get({id: $routeParams.eventId}, function(event) {
    $scope.event = new Event(event);

    if ($routeParams.formId) {
      var form = _.find(event.forms, function(form) {
        return form.id.toString() === $routeParams.formId;
      });
      $scope.form = new Form(form);

      _.each($scope.form.fields, function(field) {
        if (field.name === $scope.form.primaryField) {
          $scope.primaryField = field;
        }
      })

      function getObservationIconUrl(observation) {
        if (observation.properties.forms.length) {
          var firstForm = observation.properties.forms[0];
          primaryField = firstForm[form.primaryField];
          variantField = firstForm[form.variantField];
        }
  
        return getObservationIconUrlForEvent($routeParams.eventId, $routeParams.formId, primaryField, variantField);
      }

      function getObservationIconUrlForEvent(eventId, formId, primary, variant) {
        var url = '/api/events/' + eventId + '/icons';
    
        if (formId) {
          url += '/' + formId;
        }
    
        if (primary) {
          url += '/' + primary;
        }
    
        if (variant) {
          url += '/' + variant;
        }
    
        return url + '?' + $.param({access_token: LocalStorageService.getToken()});
      }

      function createFakeObservation(fakeObservationFormFields) {
        _.each($scope.form.fields, function(field) {
          if (field.value) {
            fakeObservationFormFields[field.name] = field.value
          } else {
            switch(field.type) {
              case 'dropdown':
              case 'multiselectdropdown':
                fakeObservationFormFields[field.name] = field.choices[Math.floor(Math.random() * field.choices.length)].title
                break;
              case 'date':
                fakeObservationFormFields[field.name] = moment(new Date()).toISOString()
                break;
              default:
                fakeObservationFormFields[field.name] = 'Sample'
            }
          }
        });
        return fakeObservationFormFields;
      }
      $scope.event.forms = [$scope.form]
      UserService.getMyself().then(function(myself) {
        $scope.observations = [{
          "id": 0,
          "createdAt": moment(new Date()).toISOString(),
          "geometry": {
            "type": "Point",
            "coordinates": [
              180 - (360 * Math.random()),
              80 - (160 * Math.random())
            ]
          },
          "lastModified": moment(new Date()).toISOString(),
          "properties": {
            "timestamp": moment(new Date()).toISOString(),
            "forms": [
              createFakeObservation({
                formId: Number($routeParams.formId)
              })
            ]
          },
          "type": "Feature",
          "userId": myself.id
        },{
          "id": 1,
          "createdAt": moment(new Date()).toISOString(),
          "geometry": {
            "type": "Point",
            "coordinates": [
              180 - (360 * Math.random()),
              80 - (160 * Math.random())
            ]
          },
          "lastModified": moment(new Date()).toISOString(),
          "properties": {
            "timestamp": moment(new Date()).toISOString(),
            "forms": [
              createFakeObservation({
                formId: Number($routeParams.formId)
              })
            ]
          },
          "type": "Feature",
          "userId": myself.id
        },{
          "id": 2,
          "createdAt": moment(new Date()).toISOString(),
          "geometry": {
            "type": "Point",
            "coordinates": [
              180 - (360 * Math.random()),
              80 - (160 * Math.random())
            ]
          },
          "lastModified": moment(new Date()).toISOString(),
          "properties": {
            "timestamp": moment(new Date()).toISOString(),
            "forms": [
              createFakeObservation({
                formId: Number($routeParams.formId)
              })
            ]
          },
          "type": "Feature",
          "userId": myself.id
        }]
        $scope.observations.forEach(function(obs) {
          obs.style = {
            iconUrl: getObservationIconUrl(obs)
          }
        });
      })
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

  var debouncedAutoSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.form.$save({eventId: $scope.event.id, id: $scope.form.id}, function() {
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
    formSaved = false;
    $scope.saving = true;
    debouncedAutoSave();
  };

  function completeSave() {
    if ($scope.filesToUpload.length === 0 && formSaved) {
      $scope.saving = false;
      $scope.unSavedChanges = false;
      delete $scope.exportError;
    }
  }

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
