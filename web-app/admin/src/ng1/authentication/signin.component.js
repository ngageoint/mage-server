import _ from 'underscore';

class SigninController {

  constructor(UserService, $element) {
    this._UserService = UserService;
    this._$element = $element;
  }

  $onInit() {
    this.localAuthenticationStrategy = this.api.authenticationStrategies.local;
    if (this.localAuthenticationStrategy) {
      this.localAuthenticationStrategy.name = 'local';
    }
    
    this.thirdPartyStrategies = _.map(_.omit(this.api.authenticationStrategies, this.localStrategyFilter), function(strategy, name) {
      strategy.name = name;
      return strategy;
    });
  }

  localStrategyFilter(_strategy, name) {
    return name === 'local';
  }

  signin($event) {
    this.onSignin({$event});
  }
}

SigninController.$inject = ['UserService', '$element'];

export default {
  template: require('./signin.component.html'),
  bindings: {
    api: '<',
    onSignin: '&',
    onSignup: '&',
    hideSignup: '<'
  },
  controller: SigninController
};