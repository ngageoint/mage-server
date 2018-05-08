module.exports = {
  template: require('./local.signin.html'),
  bindings: {
    strategy: '<',
    signinType: '@',
    onSignin: '&'
  },
  controller: LocalSigninController
};

LocalSigninController.$inject = ['UserService'];

function LocalSigninController(UserService) {

  this.signin = function() {
    var self = this;
    UserService.login({username: this.username, uid: this.uid, password: this.password})
      .then(function () { // success
        self.onSignin();
      },
      function (response) { // error
        self.showStatus = true;
        self.statusTitle = 'Failed login';
        self.statusMessage = response.data || 'Please check your username, UID, and password and try again.';
        self.statusLevel = 'alert-danger';
      });
  };

}
