var _ = require('underscore')
  , $ = require('jquery')
  , moment = require('moment')
  , MDCTopAppBar = require('material-components-web').topAppBar.MDCTopAppBar;

module.exports = function userView() {
  var directive = {
    restrict: "E",
    template:  require('./user-view.directive.html'),
    scope: {
      user: '=user',
      event: '=event',
      observations: '=observations'
    },
    controller: UserViewController
  };

  return directive;
};
UserViewController.$inject = ['$scope', '$element', 'MapService'];

function UserViewController($scope, $element, MapService) {
  var scrollElement = $element[0].parentElement;
  const topAppBar = new MDCTopAppBar($element.find('.mdc-top-app-bar')[0]);
  topAppBar.setScrollTarget(scrollElement)
  
  $scope.closeUserView = function() {
    $scope.$emit('user:viewDone', $scope.user);
  }

  $scope.userObservations = _.filter($scope.observations, function(observation) {
    return observation.userId === $scope.user.id;
  });

  $scope.viewObservation = function(observation) {
    $scope.$emit('observation:view', observation);
  }

  $scope.onUserLocationClick = function(user) {
    MapService.zoomToFeatureInLayer(user, 'People');
  };
}
