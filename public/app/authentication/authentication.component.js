class AuthenticationComponentController {

  constructor($routeParams, UserService, $location, authService) {
    this._$routeParams = $routeParams;
    this._UserService = UserService;
    this._$location = $location;
    this._authService = authService;

    this.action = $routeParams.action;
  }

  $onInit() {
    if (this.api.initial) {
      this.action = 'setup';
    }
  }

  hideStatus() {
    this.showStatus = false;
  }

  returnToSignin() {
    this._UserService.logout();
    this.action = 'signin';
    this.onFailure();
  }

  onSignup() {
    this.action = 'signup';
  }

  showAbout() {
    this.action = 'about';
  }

  showSignupSuccess() {
    this.action = 'signup-confirm';
  }

  authorized() {
    var disclaimer = this.api.disclaimer || {};
    if (!disclaimer.show) {
      this._authService.loginConfirmed();
      this._UserService.acceptDisclaimer();
      this.onSuccess();
      return;
    }
    this.action = 'disclaimer';
  }

  acceptDisclaimer() {
    this._UserService.acceptDisclaimer();
    this.onSuccess();
  }

  onSignin(user) {
    this.user = user;
    this.action = 'device-id';
  }
}

AuthenticationComponentController.$inject = ['$routeParams', 'UserService', '$location', 'authService'];

var template = require('./authentication.component.html');
var bindings = {
  api: '<',
  hideSignup: '<',
  onSuccess: '&',
  onFailure: '&'
};
var controller = AuthenticationComponentController;

export {
  template,
  bindings,
  controller
};
