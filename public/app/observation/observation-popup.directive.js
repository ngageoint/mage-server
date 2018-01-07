var _ = require('underscore')
  , moment = require('moment');

module.exports = function observationPopup() {
  var directive = {
    restrict: "A",
    template:  require('./observation-popup.directive.html'),
    scope: {
      observation: '=observationPopup',
      observationPopupInfo: '&',
      observationZoom: '&'
    },
    controller: ObservationPopupDirective
  };

  return directive;
};

ObservationPopupDirective.$inject = ['$scope', 'EventService'];

function ObservationPopupDirective($scope, EventService) {

  if ($scope.observation.properties.forms.length > 0) {
    var form = _.find(EventService.getForms($scope.observation), function(form) {
      return form.id === $scope.observation.properties.forms[0].formId;
    });

    $scope.primary = null;
    if (form.primaryField) {
      $scope.primary = $scope.observation.properties.forms[0][form.primaryField];
    }

    $scope.variant = null;
    if (form.variantField) {
      $scope.variant = $scope.observation.properties.forms[0][form.variantField];
    }
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
