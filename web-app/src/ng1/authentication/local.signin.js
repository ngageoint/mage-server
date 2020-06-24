import {textField, snackbar} from 'material-components-web';

class LocalSigninController {

  constructor(UserService, $element) {
    this._UserService = UserService;
    this._$element = $element;
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[1]);
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
  }

  signin() {
    this._UserService.signin({username: this.username, password: this.password}).then(response => {
      this.onSignin({
        $event: { 
          user: response.user, 
          token: response.token, 
          strategy: this.strategy.name 
        }
      });
    }, response => {
      this.showStatus = true;
      this.statusTitle = 'Error signing in';
      this.statusMessage = response.data || 'Please check your username and password and try again.';
      this.usernameField.valid = false;
      this.passwordField.valid = false;
      this.snackbar.open();
    });
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