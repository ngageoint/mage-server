mage.directive('observationPopup', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-popup.html",
    scope: {
      observation: '=observationPopup',
      observationInfo: '&observationPopupInfo'
    },
    controller: function ($scope, EventService) {
      var form = EventService.createForm($scope.observation);

      $scope.type = $scope.observation.properties.type;
      $scope.variant = null;
      if (form.variantField) {
        $scope.variant = $scope.observation.properties[form.variantField];
      }

      $scope.date = moment($scope.observation.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");

      $scope.onInfoClicked = function() {
        $scope.observationInfo({observation: $scope.observation});
      }

      $scope.$on('$destroy', function() {
        console.log('marker popup scope destorying');
      });
    }
  };
});
