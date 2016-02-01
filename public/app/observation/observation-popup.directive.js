angular
  .module('mage')
  .directive('observationPopup', observationPopup);

function observationPopup() {
  var directive = {
    restrict: "A",
    templateUrl:  "/app/observation/observation-popup.directive.html",
    scope: {
      observation: '=observationPopup',
      observationPopupInfo: '&',
      observationZoom: '&'
    },
    controller: ObservationPopupDirective
  };

  return directive;
}

ObservationPopupDirective.$inject = ['$scope', 'EventService'];

function ObservationPopupDirective($scope, EventService) {
  var form = EventService.createForm($scope.observation);

  $scope.type = $scope.observation.properties.type;
  $scope.variant = null;
  if (form.variantField) {
    $scope.variant = $scope.observation.properties[form.variantField];
  }

  $scope.date = moment($scope.observation.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");

  $scope.onInfoClicked = function() {
    $scope.observationPopupInfo({observation: $scope.observation});
  };

  $scope.onZoomClicked = function() {
    $scope.observationZoom({observation: $scope.observation});
  };

  $scope.$watch('observation', function() {
    $scope.date = moment($scope.observation.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");
  });
}
