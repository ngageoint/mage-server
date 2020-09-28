const _ = require('underscore')
  , moment = require('moment');

function ObservationPopupDirective($scope, EventService) {
  const properties = $scope.observation.properties || {};
  if (properties.forms && properties.forms.length > 0) {
    const form = _.find(EventService.getForms($scope.observation), function(form) {
      return form.id === $scope.observation.properties.forms[0].formId;
    });

    $scope.primary = null;
    $scope.primaryFeedField = {
      value: form.primaryFeedField
    };
    if (form.primaryFeedField) {
      $scope.primary = $scope.observation.properties.forms[0][form.primaryFeedField];
    }

    $scope.variant = null;
    $scope.secondaryFeedField = {
      value: form.secondaryFeedField
    };
    if (form.secondaryFeedField) {
      $scope.variant = $scope.observation.properties.forms[0][form.secondaryFeedField];
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

module.exports = function observationPopup() {
  const directive = {
    restrict: "A",
    template: require('./observation-popup.directive.html'),
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
