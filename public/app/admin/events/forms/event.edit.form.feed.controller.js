var _ = require('underscore')
  , $ = require('jquery')
  , moment = require('moment');

module.exports = AdminEventEditFormFeedController;

AdminEventEditFormFeedController.$inject = ['$rootScope', '$scope', '$location', '$routeParams', '$uibModal', 'LocalStorageService', 'Event', 'Form', 'UserService'];

function AdminEventEditFormFeedController($rootScope, $scope, $location, $routeParams, $uibModal, LocalStorageService, Event, Form, UserService) {
  $scope.unSavedChanges = false;
  $scope.unSavedUploads = false;
  $scope.token = LocalStorageService.getToken();

  var formSaved = false;
  $scope.filesToUpload = [];
  $scope.saveTime = 0;

  function getObservationIconUrl(observation, form) {
    if (observation.properties.forms.length) {
      var firstForm = observation.properties.forms[0];
      var primaryField = firstForm[form.primaryField];
      var variantField = firstForm[form.variantField];
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

  function createFakeObservation(observationId, formId, userId) {
    return {
      id: observationId,
      createdAt: moment(new Date()).toISOString(),
      geometry: {
        type: 'Point',
        coordinates: [
          180 - (360 * Math.random()),
          80 - (160 * Math.random())
        ]
      },
      lastModified: moment(new Date()).toISOString(),
      properties: {
        timestamp: moment(new Date()).toISOString(),
        forms: [createFakeForm(formId)]
      },
      type: 'Feature',
      userId: userId
    };
  }

  function createFakeForm(formId) {
    var form = {
      formId: formId
    };

    $scope.form.fields.forEach(field => {
      switch(field.type) {
      case 'radio':
      case 'dropdown':
        if (field.choices.length) {
          form[field.name] = field.choices[Math.floor(Math.random() * field.choices.length)].title;
        } else {
          form[field.name] = '';
        }
        break;
      case 'multiselectdropdown':
        if (field.choices.length) {
          var choices = new Set();
          for (var i = 0; i < Math.floor(Math.random() * field.choices.length); i++) {
            choices.add(field.choices[Math.floor(Math.random() * field.choices.length)].title);
          }

          form[field.name] = Array.from(choices).join(', ');
        } else {
          form[field.name] = '';
        }
        break;
      case 'checkbox':
        var randomChecked = Math.floor(Math.random() * 2);
        form[field.name] = randomChecked === 1 ? field.title : '';
        break;
      case 'numberfield':
        form[field.name] = Math.floor(Math.random() * 100) + 1;
        break;
      case 'date':
        form[field.name] = moment(new Date()).toISOString();
        break;
      case 'textarea':
        form[field.name] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Nam at lectus urna duis convallis convallis tellus.';
        break;
      case 'password':
        form[field.name] = '**********';
        break;
      case 'email':
        form[field.name] = 'mage@email.com';
        break;
      case 'geometry':
        form[field.name] = {
          type: 'Point',
          coordinates: [
            180 - (360 * Math.random()),
            80 - (160 * Math.random())
          ]
        };
        break;
      default:
        form[field.name] = 'Lorem ipsum';
      }
    });

    return form;
  }

  Event.get({id: $routeParams.eventId}, function(event) {
    $scope.event = new Event(event);

    if ($routeParams.formId) {
      var form = _.find(event.forms, function(form) {
        return form.id.toString() === $routeParams.formId;
      });
      $scope.form = new Form(form);

      $scope.primaryField = $scope.form.fields.find(field => { return field.name === $scope.form.primaryField; });

      $scope.event.forms = [$scope.form];
      UserService.getMyself().then(function(myself) {
        $scope.observations = [];
        for (var i = 0; i < 3; i++) {
          var observation = createFakeObservation(i, Number($routeParams.formId), myself.id);
          observation.style = {
            iconUrl: getObservationIconUrl(observation, form)
          };
          $scope.observations.push(observation);
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
