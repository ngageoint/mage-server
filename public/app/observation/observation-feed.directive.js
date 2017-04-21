angular
  .module('mage')
  .directive('observationNewsItem', observationNewsItem);

function observationNewsItem() {
  var directive = {
    restrict: "A",
    templateUrl:  "/app/observation/observation-feed.directive.html",
    scope: {
      observation: '=observationNewsItem'
    },
    controller: ObservationNewsItemController
  };

  return directive;
}

ObservationNewsItemController.$inject = ['$scope', '$window', '$uibModal', 'EventService', 'UserService', 'LocalStorageService'];

function ObservationNewsItemController($scope, $window, $uibModal, EventService, UserService, LocalStorageService) {
  $scope.edit = false;
  $scope.isUserFavorite = _.contains($scope.observation.favoriteUserIds, UserService.myself.id);
  $scope.canEditImportant = _.contains(UserService.myself.role.permissions, 'UPDATE_EVENT');
  $scope.importantPopoverIsOpen = false;
  $scope.canEdit = UserService.hasPermission('UPDATE_OBSERVATION_EVENT') || UserService.hasPermission('UPDATE_OBSERVATION_ALL');
  $scope.fromNow = moment($scope.observation.properties.timestamp).fromNow();

  UserService.getUser($scope.observation.userId).then(function(user) {
    $scope.observationUser = user.data || user;
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
      templateUrl: '/app/observation/observation-favorites.html',
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
    description: $scope.observation.important ? $scope.observation.important.description : null
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

  $scope.filterHidden = function(field) {
    return !field.archived &&
      field.name !== 'geometry' &&
      field.name !== 'timestamp' &&
      field.name !== 'type' &&
      field.name !== $scope.form.variantField;
  };

  $scope.editObservation = function() {
    $scope.onObservationLocationClick($scope.observation);
    $scope.edit = true;
    $scope.editForm = angular.copy($scope.form);
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
    $scope.form = EventService.createForm(observation);
    $scope.isUserFavorite = _.contains($scope.observation.favoriteUserIds, UserService.myself.id);
  }, true);

  $scope.$watch('observation.important', function(important) {
    if (!important) return;

    $scope.importantPopover.description = important.description;
    UserService.getUser(important.userId).then(function(user) {
      $scope.importantUser = user.data || user;
    });
  });
}
