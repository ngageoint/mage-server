var _ = require('underscore');

module.exports = AdminEventEditFormController;

AdminEventEditFormController.$inject = ['$rootScope', '$scope', '$location', '$routeParams', '$uibModal', 'LocalStorageService', 'Event', 'Form'];

function AdminEventEditFormController($rootScope, $scope, $location, $routeParams, $uibModal, LocalStorageService, Event, Form) {
  $scope.unSavedChanges = false;
  $scope.unSavedUploads = false;
  $scope.token = LocalStorageService.getToken();

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

    if ($scope.generalForm.$invalid) {
      return;
    }

    formSaved = false;
    $scope.saving = true;
    debouncedAutoSave();
  };

  function completeSave() {
    if (formSaved) {
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
