var _ = require('underscore')
  , $ = require('jquery')
  , moment = require('moment');

module.exports = function observationNewsItem() {
  var directive = {
    restrict: "A",
    template:  require('./observation-feed.directive.html'),
    scope: {
      observation: '=observationNewsItem'
    },
    controller: ObservationNewsItemController
  };

  return directive;
};

ObservationNewsItemController.$inject = ['$scope', '$window', '$uibModal', 'EventService', 'UserService', 'FilterService', 'LocalStorageService'];

function ObservationNewsItemController($scope, $window, $uibModal, EventService, UserService, FilterService, LocalStorageService) {
  $scope.edit = false;
  $scope.isUserFavorite = _.contains($scope.observation.favoriteUserIds, UserService.myself.id);
  $scope.fromNow = moment($scope.observation.properties.timestamp).fromNow();
  $scope.canEdit = UserService.hasPermission('UPDATE_OBSERVATION_EVENT') || UserService.hasPermission('UPDATE_OBSERVATION_ALL');

  var myAccess = FilterService.getEvent().acl[UserService.myself.id];
  var aclPermissions = myAccess ? myAccess.permissions : [];
  $scope.canEditImportant = _.contains(UserService.myself.role.permissions, 'UPDATE_EVENT') || _.contains(aclPermissions, 'update');

  UserService.getUser($scope.observation.userId).then(function(user) {
    $scope.observationUser = user;
  });

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

  $scope.importantPopover = {
    isOpen: false,
    description: $scope.observation.important ? $scope.observation.important.description : null,
    template: require('./observation-important.html')
  };

  $scope.closeImportantPopover = function() {
    $scope.importantPopover.isOpen = false;
  };

  $scope.markAsImportant = function() {
    EventService.markObservationAsImportant($scope.observation, {description: $scope.importantPopover.description}).then(function() {
      $scope.importantPopover.isOpen = false;
    });
  };

  $scope.clearImportant = function() {
    EventService.clearObservationAsImportant($scope.observation).then(function() {
      $scope.importantPopover.isOpen = false;
      delete $scope.importantPopover.description;
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

  $scope.editObservation = function() {
    $scope.onObservationLocationClick($scope.observation);
    $scope.edit = true;

    var formMap = _.indexBy(EventService.getForms($scope.observation), 'id');
    var form = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        name: 'geometry',
        value: $scope.observation.geometry
      },
      timestampField: {
        title: 'Date',
        type: 'date',
        value: moment($scope.observation.properties.timestamp).toDate()
      },
      forms: []
    };

    _.each($scope.observation.properties.forms, function(propertyForm) {
      var observationForm = EventService.createForm($scope.observation, formMap[propertyForm.formId]);
      observationForm.name = formMap[propertyForm.formId].name;
      form.forms.push(observationForm);
    });

    $scope.editForm = form;
  };

  $scope.onObservationLocationClick = function(observation) {
    $scope.$emit('observation:zoom', observation, {panToLocation: true, zoomToLocation: true});
  };

  $scope.$on('observation:editDone', function() {
    $scope.edit = false;
    $scope.editForm = null;
  });

  $scope.$on('observation:poll', function() {
    $scope.fromNow = moment($scope.observation.properties.timestamp).fromNow();
  });

  $scope.$watch('observation', function(observation) {
    var formMap = _.indexBy(EventService.getForms(observation), 'id');
    $scope.observationForm = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        value: observation.geometry
      },
      timestampField: {
        title: 'Date',
        type: 'date',
        value: moment(observation.properties.timestamp).toDate()
      },
      forms: []
    };

    _.each(observation.properties.forms, function(form) {
      var observationForm = EventService.createForm(observation, formMap[form.formId]);
      observationForm.name = formMap[form.formId].name;
      $scope.observationForm.forms.push(observationForm);
    });

    if ($scope.observation.properties.forms.length > 0) {
      var firstForm = $scope.observation.properties.forms[0];
      var observationForm = $scope.observationForm.forms.find(function(observationForm) {
        return observationForm.id === firstForm.formId;
      });

      if (observationForm.primaryField && firstForm[observationForm.primaryField]) {
        $scope.primaryField = {
          value: firstForm[observationForm.primaryField]
        };
      }

      if (observationForm.variantField && firstForm[observationForm.variantField]) {
        $scope.variantField = {
          value: firstForm[observationForm.variantField]
        };
      }
    }

    $scope.isUserFavorite = _.contains(observation.favoriteUserIds, UserService.myself.id);
  }, true);

  $scope.$watch('observation.important', function(important) {
    if (!important) return;

    $scope.importantPopover.description = important.description;
    UserService.getUser(important.userId).then(function(user) {
      $scope.importantUser = user;
    });
  });
}
