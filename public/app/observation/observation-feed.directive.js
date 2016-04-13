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

ObservationNewsItemController.$inject = ['$scope', 'EventService', 'UserService'];

function ObservationNewsItemController($scope, EventService, UserService) {
  $scope.edit = false;
  $scope.canEdit = UserService.hasPermission('UPDATE_OBSERVATION_EVENT') || UserService.hasPermission('UPDATE_OBSERVATION_ALL');
  $scope.fromNow = moment($scope.observation.properties.timestamp).fromNow();

  UserService.getUser($scope.observation.userId).then(function(user) {
    $scope.observationUser = user.data || user;
  });

  $scope.filterHidden = function(field) {
    return !field.archived &&
      field.name !== 'geometry' &&
      field.name !== 'timestamp' &&
      field.name !== 'type' &&
      field.name !== $scope.form.variantField;
  };

  $scope.editObservation = function() {
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
  }, true);
}
