import { textField } from 'material-components-web';

class LocalSigninController {

  constructor(UserService, $element) {
    this._UserService = UserService;
    this._$element = $element;
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[1]);
  }

  signin() {
    this._UserService.signin({ username: this.username, password: this.password }).then(response => {
      this.onSignin({
        $event: {
          user: response.user,
          token: response.token,
          strategy: this.strategy.name
        }
      });
    }, response => {
      this.statusTitle = 'Error signing in';
      this.statusMessage = response.data || 'Please check your username and password and try again.';
      this.id = this.username;
      this.usernameField.valid = false;
      this.passwordField.valid = false;
      this.info = {
        statusTitle: this.statusTitle,
        statusMessage: this.statusMessage,
        id: this.username
      };
      this.contactOpen = { opened: true };
    });
  }

  onContactClose() {
    this.contactOpen = { opened: false };
  }
}

LocalSigninController.$inject = ['UserService', '$element'];

export default {
  template: require('./local.signin.html'),
  bindings: {
    strategy: '<',
    onSignin: '&',
    onSignup: '&',
    hideSignup: '<'
  },
  controller: LocalSigninController
};