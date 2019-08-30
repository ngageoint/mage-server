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
    ]
  
    this.backgroundClass = backgrounds[Math.floor(Math.random() * 4)]

    this.localAuthenticationStrategy = this.api.authenticationStrategies.local;
    this.thirdPartyStrategies = _.map(_.omit(this.api.authenticationStrategies, this.localStrategyFilter), function(strategy, name) {
      strategy.name = name;
      return strategy;
    });

    this.action = $routeParams.action;
  }

  localStrategyFilter(strategy, name) {
    return name === 'local';
  }

  hideStatus() {
    this.showStatus = false;
  };

  returnToSignin() {
    this._UserService.logout();
    this.action = 'signin';
  }

  localSignup() {
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
      if (this._$location.path() === '/signin') return;
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

  localSignin(user) {
    this.user = user;
    this.action = 'device-id';
  }
}

export default AuthenticationController
