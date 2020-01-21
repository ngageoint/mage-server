import {textField, snackbar} from 'material-components-web';

class LocalSigninController {

  constructor(UserService, $element, $timeout) {
    this._UserService = UserService;
    this._$element = $element;
    this._$timeout = $timeout;
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[1]);
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
  }

  signin() {
    this._UserService.signin({username: this.username, password: this.password}).then(response => {
      var user = response.user;
      this.onSignin({user: user});
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

var template = require('./local.signin.html');
var bindings = {
  strategy: '<',
  signinType: '@',
  onSignin: '&',
  onSignup: '&',
  hideSignup: '<'
};
var controller = LocalSigninController;

LocalSigninController.$inject = ['UserService', '$element', '$timeout'];

export {
  template,
  bindings,
  controller
};