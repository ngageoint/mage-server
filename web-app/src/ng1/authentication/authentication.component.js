class AuthenticationController {

  constructor($stateParams, UserService, authService) {
    this._UserService = UserService;
    this._authService = authService;

    this.action = $stateParams.action;
    this.strategy = $stateParams.strategy;
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
    this.action = 'inactive-account';
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

  onSignin(user, strategy) {
    this.user = user;
    this.strategy = strategy;
    this.action = 'authorize-device';
  }
}

AuthenticationController.$inject = ['$stateParams', 'UserService',  'authService'];

export default {
  template: require('./authentication.component.html'),
  bindings: {
    api: '<',
    hideSignup: '<',
    onSuccess: '&',
    onFailure: '&'
  },
  controller: AuthenticationController
};