angular
  .module('mage')
  .controller('SigninController', SigninController);

SigninController.$inject = ['$scope', '$rootScope', 'UserService', 'ApiService'];

function SigninController($scope, $rootScope, UserService, ApiService) {
  $scope.status = 0;
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  ApiService.get(function(api) {
    $scope.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, localStrategyFilter), function(strategy, name) {
      strategy.name = name;
      return strategy;
    });

    $scope.localAuthenticationStrategy = api.authenticationStrategies.local;
  });

  $scope.signin = function () {
    UserService.login({username: this.username, uid: this.uid, password: this.password})
      .then(function () {
        // success
      },
      function () {
        $scope.showStatus = true;
        $scope.statusTitle = 'Failed login';
        $scope.statusMessage = 'Please check your username, UID, and password and try again.';
        $scope.statusLevel = 'alert-danger';
      });
  };

  $scope.googleSignin = function() {
    UserService.oauthSignin('google', {uid: this.uid}).then(function() {
      //success
    }, function(data) {
      $scope.showStatus = true;

      if (data.device && !data.device.registered) {
        $scope.statusTitle = 'Device Pending Registration';
        $scope.statusMessage = data.errorMessage;
        $scope.statusLevel = 'alert-warning';
      } else {
        $scope.statusTitle = 'Error signing in';
        $scope.statusMessage = data.errorMessage;
        $scope.statusLevel = 'alert-danger';
      }
    });
  };

  function localStrategyFilter(strategy, name) {
    return name === 'local';
  }
}
