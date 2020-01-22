var _ = require('underscore');

module.exports = SigninController;

SigninController.$inject = ['$scope', 'api'];

function SigninController($scope, api) {
  $scope.status = 0;
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  $scope.localAuthenticationStrategy = api.authenticationStrategies.local;
  $scope.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, localStrategyFilter), function(strategy, name) {
    strategy.name = name;
    return strategy;
  });

  function localStrategyFilter(strategy, name) {
    return name === 'local';
  }

  $scope.hideStatus = function() {
    $scope.showStatus = false;
  };
}
