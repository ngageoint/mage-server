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
    controller: ObservationNewsItemController,
    bindToController: true
  }

  return directive;
}

ObservationNewsItemController.$inject = ['$scope', 'EventService', 'UserService', 'LocalStorageService'];

function ObservationNewsItemController($scope, EventService, UserService, LocalStorageService) {
  $scope.edit = false;
  $scope.attachmentUrl = '/FeatureServer/' + $scope.observation.layerId + '/features/';
  $scope.token = LocalStorageService.getToken();

  UserService.getUser($scope.observation.userId).then(function(user) {
    $scope.observationUser = user.data || user;
  });

  $scope.filterHidden = function(field) {
    return !field.archived &&
      field.name !== 'geometry' &&
      field.name !== 'timestamp' &&
      field.name !== 'type' &&
      field.name !== $scope.form.variantField;
  }

  $scope.editObservation = function() {
    $scope.edit = true;
    $scope.editForm = angular.copy($scope.form);
  }

  $scope.onObservationClick = function(observation) {
    $scope.$emit('observation:selected', observation, {panToLocation: true});
  }

  $scope.$on('observation:editDone', function() {
    $scope.edit = false;
    $scope.editForm = null;
  });

  $scope.$watch('observation', function(observation) {
    $scope.form = EventService.createForm(observation);
  }, true);
}
