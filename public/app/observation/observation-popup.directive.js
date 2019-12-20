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

ObservationPopupDirective.$inject = ['$scope', 'EventService', 'UserService'];

function ObservationPopupDirective($scope, EventService, UserService) {
  let properties = $scope.observation.properties || {};
  if (properties.forms && properties.forms.length > 0) {
    var form = _.find(EventService.getForms($scope.observation), function(form) {
      return form.id === $scope.observation.properties.forms[0].formId;
    });

    $scope.primary = null;
    if (form.primaryFeedField) {
      $scope.primary = $scope.observation.properties.forms[0][form.primaryFeedField];
    }

    $scope.variant = null;
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
    UserService.getUser($scope.observation.userId).then(function(user) {
      $scope.observationUser = user;
    });
  });
}
