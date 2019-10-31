import _ from 'underscore';

class SignupController {

  constructor(Api) {
    this._Api = Api;
  }

  $onInit() {
    this.user = {};
    this.showStatus = false;
    this.statusTitle = '';
    this.statusMessage = '';

    this._Api.get(api => {
      this.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, this.localStrategyFilter), function(strategy, name) {
        strategy.name = name;
        return strategy;
      });
  
      this.localAuthenticationStrategy = api.authenticationStrategies.local;
      if (this.localAuthenticationStrategy && this.localAuthenticationStrategy.passwordMinLength) {
        this.passwordPlaceholder = this.localAuthenticationStrategy.passwordMinLength + ' characters, alphanumeric';
      }
    });
  }

  localStrategyFilter(_, name) {
    return name === 'local';
  }
}

SignupController.$inject = ['Api'];

export default {
  template: require('./signup.html'),
  bindings: {
    api: '<'
  },
  controller: SignupController
};

