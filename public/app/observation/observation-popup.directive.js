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

  // TODO decide what to show on popup
  // var form = EventService.createForm($scope.observation);

  // $scope.primary = null;
  // if (observationForm.primaryField) {
  //   $scope.primary = $scope.observation.properties[observationForm.primaryField];
  // }
  //
  // $scope.variant = null;
  // if (observationForm.variantField) {
  //   $scope.variant = $scope.observation.properties[observationForm.variantField];
  // }

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
