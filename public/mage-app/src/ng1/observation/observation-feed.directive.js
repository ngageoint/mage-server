var _ = require('underscore')
  , $ = require('jquery')
  , moment = require('moment')
  , MDCRipple = require('material-components-web').ripple.MDCRipple
  , MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = function observationNewsItem() {
  var directive = {
    restrict: "A",
    template:  require('./observation-feed.directive.html'),
    scope: {
      observation: '=observationNewsItem',
      event: '=event',
      form: '=selectedObservationForm'
    },
    controller: ObservationNewsItemController
  };

  return directive;
};

ObservationNewsItemController.$inject = ['$scope', '$uibModal', 'EventService', 'UserService', 'LocalStorageService', '$element', '$timeout', 'MapService'];

function ObservationNewsItemController($scope, $uibModal, EventService, UserService, LocalStorageService, $element, $timeout, MapService) {
  const iconButtonRipple = new MDCRipple(document.querySelector('.mdc-icon-button'));
  iconButtonRipple.unbounded = true;
  $scope.edit = false;
  $scope.isUserFavorite = false;
  $scope.canEdit = false;
  $scope.canEditImportant = false;
  var importantEditField;

  UserService.getUser($scope.observation.userId).then(function(user) {
    $scope.observationUser = user;
  });

  if ($scope.observation.important) {
    UserService.getUser($scope.observation.important.userId).then(function(user) {
      $scope.observationImportantUser = user;
    });
  }

  $scope.toggleFavorite = function() {
    if ($scope.isUserFavorite) {
      EventService.removeObservationFavorite($scope.observation).then(function(observation) {
        $scope.observation.favoriteUserIds = observation.favoriteUserIds;
        $scope.isUserFavorite = false;
      });
    } else {
      EventService.addObservationFavorite($scope.observation).then(function(observation) {
        $scope.observation.favoriteUserIds = observation.favoriteUserIds;
        $scope.isUserFavorite = true;
      });
    }
  };

  $scope.showFavoriteUsers = function() {
    $uibModal.open({
      template: require('./observation-favorites.html'),
      scope: $scope,
      openedClass: 'observation-favorite-modal-content',
      controller: ['$scope', '$uibModalInstance', 'UserService', function ($scope, $uibModalInstance, UserService) {
        $scope.favoriteUsers = [];
        _.each($scope.observation.favoriteUserIds, function(userId) {
          UserService.getUser(userId).then(function(user) {
            $scope.favoriteUsers.push(user);
          });
        });

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });
  };

  $scope.importantEditor = {
    isOpen: false,
    description: $scope.observation.important ? $scope.observation.important.description : null,
    template: require('./observation-important.html')
  };

  $scope.onFlagAsImportant = function() {
    $scope.importantEditor.isOpen = true;
    $timeout(function() {
      importantEditField = importantEditField || new MDCTextField($element.find('.important-textarea')[0]);
    });
  };

  $scope.markAsImportant = function() {
    EventService.markObservationAsImportant($scope.observation, {description: $scope.importantEditor.description}).then(function() {
      $scope.importantEditor.isOpen = false;
    });
  };

  $scope.clearImportant = function() {
    EventService.clearObservationAsImportant($scope.observation).then(function() {
      $scope.importantEditor.isOpen = false;
      delete $scope.importantEditor.description;
    });
  };

  $scope.download = function() {
    var url = '/api/events/' + $scope.observation.eventId + '/observations/' + $scope.observation.id + '.zip?access_token=' +  LocalStorageService.getToken();
    $.fileDownload(url)
      .done(function() {
      })
      .fail(function() {
      });
  };

  $scope.viewObservation = function() {
    $scope.onObservationLocationClick($scope.observation);
    $scope.$emit('observation:view', $scope.observation);
  };

  $scope.editObservation = function() {
    $scope.onObservationLocationClick($scope.observation);
    $scope.$emit('observation:edit', $scope.observation);
  };

  $scope.onObservationLocationClick = function() {
    MapService.zoomToFeatureInLayer($scope.observation, 'Observations');
  };

  $scope.$on('observation:editDone', function() {
    $scope.edit = false;
    $scope.editForm = null;
  });

  $scope.$watch('event', observationOrEventChanged);
  $scope.$watch('form', observationOrEventChanged, true);
  $scope.$watch('observation', observationOrEventChanged, true);

  function observationOrEventChanged() {
    if (!$scope.observation || !$scope.event) return;
    $scope.isUserFavorite = _.contains($scope.observation.favoriteUserIds, UserService.myself.id);
    $scope.canEdit = UserService.hasPermission('UPDATE_OBSERVATION_EVENT') || UserService.hasPermission('UPDATE_OBSERVATION_ALL');

    var myAccess = $scope.event.acl[UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];
    $scope.canEditImportant = _.contains(UserService.myself.role.permissions, 'UPDATE_EVENT') || _.contains(aclPermissions, 'update');

    var formMap = _.indexBy(EventService.getFormsForEvent($scope.event), 'id');
    $scope.observationForm = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        value: $scope.observation.geometry
      },
      timestampField: {
        title: 'Date',
        type: 'date',
        value: moment($scope.observation.properties.timestamp).toDate()
      },
      forms: []
    };

    _.each($scope.observation.properties.forms, function(form) {
      var observationForm = EventService.createForm($scope.observation, formMap[form.formId]);
      observationForm.name = formMap[form.formId].name;
      $scope.observationForm.forms.push(observationForm);
    });

    $scope.primaryFeedField = {};
    $scope.secondaryFeedField = {};

    if ($scope.observation.properties.forms.length > 0) {
      var firstForm = $scope.observation.properties.forms[0];
      var observationForm = $scope.observationForm.forms.find(function(observationForm) {
        return observationForm.id === firstForm.formId;
      });

      if (observationForm.primaryFeedField && firstForm[observationForm.primaryFeedField]) {
        var field = observationForm.fields.find(field => { return field.name === observationForm.primaryField });
        $scope.primaryFeedField = {
          field: field,
          value: firstForm[observationForm.primaryFeedField]
        };
      }

      if (observationForm.secondaryFeedField && firstForm[observationForm.secondaryFeedField]) {
        var field = observationForm.fields.find(field => { return field.name === observationForm.secondaryFeedField });
        $scope.secondaryFeedField = {
          field: field,
          value: firstForm[observationForm.secondaryFeedField]
        };
      }
    }

    $scope.isUserFavorite = _.contains($scope.observation.favoriteUserIds, UserService.myself.id);
  }

  $scope.$watch('observation.important', function(important) {
    if (!important) return;

    $scope.importantEditor.description = important.description;
    UserService.getUser(important.userId).then(function(user) {
      $scope.importantUser = user;
    });
  });
}
