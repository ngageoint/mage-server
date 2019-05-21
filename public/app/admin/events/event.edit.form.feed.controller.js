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
          fakeObservationFormFields
        ]
      },
      "type": "Feature",
      "userId": myself.id,
      "style": {
        "iconUrl": `/api/events/1/icons/1?access_token=${LocalStorageService.getToken()}`
      }
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
          fakeObservationFormFields
        ]
      },
      "type": "Feature",
      "userId": myself.id,
      "style": {
        "iconUrl": `/api/events/1/icons/1?access_token=${LocalStorageService.getToken()}`
      }
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
          fakeObservationFormFields
        ]
      },
      "type": "Feature",
      "userId": myself.id,
      "style": {
        "iconUrl": `/api/events/1/icons/1?access_token=${LocalStorageService.getToken()}`
      }
    }]
  })
  
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
        if (field.value) {
          fakeObservationFormFields[field.name] = field.value
        } else {
          switch(field.type) {
            case 'dropdown':
            case 'multiselectdropdown':
              fakeObservationFormFields[field.name] = field.choices[0].title
              break;
            case 'date':
              fakeObservationFormFields[field.name] = moment(new Date()).toISOString()
              break;
            default:
              fakeObservationFormFields[field.name] = 'Sample'
          }
        }
      });
      $scope.event.forms = [$scope.form]
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

      if ($location.path().indexOf('/forms/new') !== -1) {
        $location.path('/admin/events/' + $scope.event.id + '/forms/' + $scope.form.id);
        return;
      }
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
