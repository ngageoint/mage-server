module.exports = {
  template: require('./oauth.signin.html'),
  bindings: {
    type: '@strategyType',
    strategy: '<',
    onAuthenticate: '&'
  },
  controller: OAuthSigninController
};

OAuthSigninController.$inject = ['$uibModal', 'UserService'];

function OAuthSigninController($uibModal, UserService) {
  var self = this;

  this.$onInit = function() {
    this.buttonText = this.type === 'signin' ? 'Sign In With ' + this.strategy.title : 'Sign Up With ' + this.strategy.title;
  };

  this.signin = function() {
    var self = this;
    var strategy = this.strategy;
    UserService.oauthSignin(strategy.name).then(function(authData) {
      var user = authData.user;
      var oauth = authData.oauth;

      // User has an account, but its not active
      if (!user.active) {
        self.showStatus = true;
        self.statusTitle = 'Account Created';
        self.statusMessage = 'Please contact a MAGE administrator to activate your account.';
        self.statusLevel = 'alert-success';
        return;
      }

      self.onAuthenticate();

      $uibModal.open({
        template: require('./authorize-modal.html'),
        controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
          $scope.user = user;
          $scope.authorize = function (params) {
            UserService.authorize(strategy.name, user, false, {access_token: oauth.access_token, uid: params.uid}).success(function(data) {
              if (data.device.registered) {
                $uibModalInstance.close($scope);
              } else {
                $scope.status = 400;
                $scope.statusTitle = 'Invalid Device ID';
                $scope.statusMessage = 'Please check your device ID and try again.';
                $scope.statusLevel = 'alert-warning';
              }
            }).error(function (data, status) {
              $scope.status = status;
              $scope.statusTitle = 'Invalid Device ID';
              $scope.statusMessage = data.errorMessage;
              $scope.statusLevel = 'alert-warning';
            });
          };

          $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
          };
        }]
      });
    }, function(data) {
      self.showStatus = true;
      self.statusTitle = 'Error signing in';
      self.statusMessage = data.errorMessage;
      self.statusLevel = 'alert-danger';
    });
  };

  this.initializeGoogleButton = function(strategy) {
    console.log('strategy', strategy)
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

  function onFail(z) {
    alert('Fail' + JSON.stringify(z));
  }

  function onWin(googleUser){
    var idToken = googleUser.getAuthResponse().id_token;
    UserService.googleSignin({uid: self.uid, token: idToken}).then(function() {
      // success
    }, function(data) {
      self.showStatus = true;

      if (data.device && !data.device.registered) {
        self.statusTitle = 'Device Pending Registration';
        self.statusMessage = data.errorMessage;
        self.statusLevel = 'alert-warning';
      } else {
        self.statusTitle = 'Error signing in';
        self.statusMessage = data.data;
        self.statusLevel = 'alert-danger';
      }
    });
  }
}
