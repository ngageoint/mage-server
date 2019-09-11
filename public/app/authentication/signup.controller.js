var _ = require('underscore');

SignupController.$inject = ['$scope', 'Api'];

function SignupController($scope, Api) {
  $scope.user = {};
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  Api.get(function(api) {
    $scope.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, localStrategyFilter), function(strategy, name) {
      strategy.name = name;
      return strategy;
    });

    $scope.localAuthenticationStrategy = api.authenticationStrategies.local;
    if ($scope.localAuthenticationStrategy && $scope.localAuthenticationStrategy.passwordMinLength) {
      $scope.passwordPlaceholder = $scope.localAuthenticationStrategy.passwordMinLength + ' characters, alphanumeric';
    }
  });

  function localStrategyFilter(strategy, name) {
    return name === 'local';
  }
}

module.exports = SignupController;
