import _ from 'underscore'

class SigninController {

  constructor(UserService, $element) {
    this._UserService = UserService;
    this._$element = $element;
    this.localAuthenticationStrategy = this.api.authenticationStrategies.local;
    this.thirdPartyStrategies = _.map(_.omit(this.api.authenticationStrategies, this.localStrategyFilter), function(strategy, name) {
      strategy.name = name;
      return strategy;
    });
  }

  localStrategyFilter(strategy, name) {
    return name === 'local';
  }

  localSignin(user) {
    this.user = user;
    this.onSignin({user: user.user, strategy: this.localAuthenticationStrategy});
  }
}

var template = require('./signin.component.html')
var bindings = {
  api: '<',
  onSignin: '&',
  onSignup: '&',
  hideSignup: '<'
};

SigninController.$inject = ['UserService', '$element'];

var controller = SigninController

export {
  template,
  bindings,
  controller
}