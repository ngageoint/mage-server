module.exports = {
  template: require('./ldap.signin.html'),
  bindings: {
    strategy: '<',
    signinType: '@',
    onSignin: '&'
  },
  controller: LdapSigninController
};

LdapSigninController.$inject = ['$uibModal', 'UserService'];

function LdapSigninController($uibModal, UserService) {

  this.signin = function() {
    var self = this;
    UserService.ldapSignin({username: this.username, password: this.password}).then(function(response) {
      var user = response.user;

      // User has an account, but its not active
      if (!user.active) {
        self.showStatus = true;
        self.statusTitle = 'Account Created';
        self.statusMessage = 'Please contact a MAGE administrator to activate your account.';
        self.statusLevel = 'alert-success';
        return;
      }

      self.onSignin();

      $uibModal.open({
        template: require('./authorize-modal.html'),
        controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
          $scope.user = user;
          $scope.authorize = function (params) {
            UserService.authorize('local', user, false, {uid: params.uid}).success(function(data) {
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
    }, function(response) {
      self.showStatus = true;
      self.statusTitle = 'Error signing in';
      self.statusMessage = response.data || 'Please check your username and password and try again.';
      self.statusLevel = 'alert-danger';
    });
  };
}
