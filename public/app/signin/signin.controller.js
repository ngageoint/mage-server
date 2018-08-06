var _ = require('underscore');

module.exports = SigninController;

SigninController.$inject = ['$scope', '$rootScope', 'UserService', 'api'];

function SigninController($scope, $rootScope, UserService, api) {
  $scope.status = 0;
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  $scope.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, localStrategyFilter), function(strategy, name) {
    strategy.name = name;
    return strategy;
  });

  $scope.localAuthenticationStrategy = api.authenticationStrategies.local;

  $scope.hideStatus = function() {
    $scope.showStatus = false;
  };

  $scope.signin = function () {
    UserService.login({username: this.username, uid: this.uid, password: this.password})
      .then(function () {
        // success
      },
      function (response) {
        $scope.showStatus = true;
        $scope.statusTitle = 'Failed login';
        $scope.statusMessage = response.data || 'Please check your username, UID, and password and try again.';
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

  function onFail(z) {
    alert('Fail' + JSON.stringify(z));
  }

  function onWin(googleUser){
    var idToken = googleUser.getAuthResponse().id_token;
    UserService.googleSignin({uid: $scope.uid, token: idToken}).then(function() {
      // success
    }, function(data) {
      $scope.showStatus = true;

      if (data.device && !data.device.registered) {
        $scope.statusTitle = 'Device Pending Registration';
        $scope.statusMessage = data.errorMessage;
        $scope.statusLevel = 'alert-warning';
      } else {
        $scope.statusTitle = 'Error signing in';
        $scope.statusMessage = data.data;
        $scope.statusLevel = 'alert-danger';
      }
    });
  }

  $scope.initializeGoogleButton = function(strategy) {
    gapi.load('auth2', function() {
      gapi.auth2.init({
        client_id: strategy.webClientID
      }).then(function() {
        var auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut().then(function () {
          gapi.signin2.render('google-signin', {
            scope: 'profile email',
            prompt: 'select_account',
            onsuccess: onWin,
            onfail: onFail,
            theme: 'dark',
            longtitle: true
          });
        });
      });
    });
  };

  function localStrategyFilter(strategy, name) {
    return name === 'local';
  }
}
