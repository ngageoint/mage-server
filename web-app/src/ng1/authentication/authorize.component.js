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

  $onInit() {
    this.showAuthorize = false;
    this._UserService.authorize(this.strategy, this.user, false, { uid: this.uid }).success(data => {
      this.onAuthorized();
    }).error(() => {
      this.showAuthorize = true;
    });
  }

  authorize() {
    this._UserService.authorize(this.strategy, this.user, false, {uid: this.uid}).success(data => {
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

AuthorizeController.$inject = ['UserService', '$element'];

export default {
  template: require('./authorize.html'),
  bindings: {
    user: '<',
    strategy: '@',
    onCancel: '&',
    onAuthorized: '&'
  },
  controller: AuthorizeController
};