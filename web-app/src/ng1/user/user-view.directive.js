const _ = require('underscore')
  , MDCTopAppBar = require('material-components-web').topAppBar.MDCTopAppBar;

function UserViewController($scope, $element, MapService) {
  $scope.user = $scope.userWithLocation.user;
  $scope.location = $scope.userWithLocation.location;

  const scrollElement = $element[0].parentElement;
  const topAppBar = new MDCTopAppBar($element.find('.mdc-top-app-bar')[0]);
  topAppBar.setScrollTarget(scrollElement);
  
  $scope.closeUserView = function() {
    $scope.$emit('user:viewDone', $scope.userWithLocation);
  };

  $scope.userObservations = _.filter($scope.observations, function(observation) {
    return observation.userId === $scope.user.id;
  });

  $scope.viewObservation = function(observation) {
    $scope.$emit('observation:view', observation);
  };

  $scope.onUserLocationClick = function(user) {
    MapService.zoomToFeatureInLayer(user, 'People');
  };
}

UserViewController.$inject = ['$scope', '$element', 'MapService'];

module.exports = function userView() {
  const directive = {
    restrict: "E",
    template: require('./user-view.directive.html'),
    scope: {
      userWithLocation: '=user',
      event: '=event',
      observations: '=observations'
    },
    controller: UserViewController
  };

  return directive;
};