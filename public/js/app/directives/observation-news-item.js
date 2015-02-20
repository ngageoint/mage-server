angular
  .module('mage')
  .directive('observationNewsItem', observationNewsItem);

function observationNewsItem() {
  var directive = {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
      observation: '=observationNewsItem'
    },
    controller: ObservationNewsItemController,
    bindToController: true
  }

  return directive;
}

ObservationNewsItemController.$inject = ['$scope', 'EventService', 'TokenService'];

function ObservationNewsItemController($scope, EventService, TokenService) {
  $scope.edit = false;
  $scope.attachmentUrl = '/FeatureServer/' + $scope.observation.layerId + '/features/';
  $scope.token = TokenService.getToken();

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

  $scope.$on('observation:editDone', function() {
    $scope.edit = false;
    $scope.editForm = null;
  });

  $scope.$watch('observation', function(observation) {
    $scope.form = EventService.createForm(observation);
  }, true);
}
