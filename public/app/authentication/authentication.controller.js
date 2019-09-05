import _ from 'underscore'

class AuthenticationController {

  constructor($routeParams, UserService, api, $location, authService) {
    this._$routeParams = $routeParams;
    this._UserService = UserService;
    this._$location = $location;
    this._authService = authService;
    this.api = api;

    var backgrounds = [
      'olympic-park-bg',
      'burkina-faso-bg',
      'philadelphia-bg',
      'rio-olympics-bg'
    ];
  
    this.backgroundClass = backgrounds[Math.floor(Math.random() * 4)];
    this.action = $routeParams.action;
  }

  hideStatus() {
    this.showStatus = false;
  };

  returnToSignin() {
    this._UserService.logout();
    this.action = 'signin';
  }

  onSignup(strategy) {
    this.action = 'signup';
  }

  showAbout() {
    this.action = 'about';
  }

  showSignupSuccess() {
    this.action = 'signup-confirm';
  }

  authorized() {
    var disclaimer = this.api.disclaimer || {}
    if (!disclaimer.show) {
      this._authService.loginConfirmed()
      this._UserService.acceptDisclaimer();
      this._$location.path('/map');
      return;
    }
    this.action = 'disclaimer';
  }

  acceptDisclaimer() {
    this._UserService.acceptDisclaimer();
    this._$location.path('/map');
  }

  onSignin(user, strategy) {
    this.user = user;
    this.action = 'device-id';
  }
}

export default AuthenticationController
