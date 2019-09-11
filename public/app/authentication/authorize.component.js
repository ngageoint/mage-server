import {textField, snackbar} from 'material-components-web';

class AuthorizeController {

  constructor(UserService, $element) {
    this._UserService = UserService;
    this._$element = $element;
  }

  $postLink() {
    this.deviceIdField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
  }

  authorize() {
    this._UserService.authorize('local', this.user, false, {uid: this.uid}).success(data => {
      if (data.device.registered) {
        this.onAuthorized({device: data});
      } else {
        this.status = status;
        this.statusTitle = 'Invalid Device ID';
        this.statusMessage = data.errorMessage || 'Device ID is invalid, please check your device ID, and try again.';
        this.deviceIdField.valid = false;
        this.statusLevel = 'alert-warning';
        this.snackbar.open();
      }
    }).error((data, status) => {
      if (status === 403) {
        this.status = status;
        this.statusTitle = 'Invalid Device ID';
        this.statusMessage = data.errorMessage || 'Device ID is invalid, please check your device ID, and try again.';
        this.deviceIdField.valid = false;
        this.statusLevel = 'alert-warning';
      } else if (status === 401) {
        this.onCancel();
      }
      this.snackbar.open();
    });
  }
}

var template = require('./authorize.html');
var bindings = {
  user: '<',
  onCancel: '&',
  onAuthorized: '&'
};
var controller = AuthorizeController;

AuthorizeController.$inject = ['UserService', '$element'];

export {
  template,
  bindings,
  controller
};