import {textField} from 'material-components-web';

class AuthorizeController {

  constructor(UserService, $element, $stateParams) {
    this._UserService = UserService;
    this._$element = $element;
    this._$stateParams = $stateParams;
  }

  $postLink() {
    this.deviceIdField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
  }

  $onInit() {
    this.showAuthorize = false;
    this._UserService.authorize(this.token, null).success(() => {
      this.onAuthorized();
    }).error(() => {
      this.showAuthorize = true;
    });
  }

  authorize() {
    const token = this._$stateParams.token || this.token;
    this._UserService.authorize(token, this.uid).success(data => {
      if (data.device.registered) {
        this.onAuthorized({device: data});
      } else {
        this.status = status;
        this.statusTitle = 'Invalid Device ID';
        this.statusMessage = data.errorMessage || 'Device ID is invalid, please check your device ID, and try again.';
        this.deviceIdField.valid = false;
        this.statusLevel = 'alert-warning';
        this.info = {
          statusTitle: this.statusTitle,
          statusMessage: this.statusMessage,
          id: this.uid
        };
        this.contactOpen = { opened: true };
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
      this.info = {
        statusTitle: this.statusTitle,
        statusMessage: this.statusMessage,
        id: this.uid
      };
      this.contactOpen = { opened: true };
    });
  }

  onContactClose() {
    this.contactOpen = { opened: false };
  }
}

AuthorizeController.$inject = ['UserService', '$element', '$stateParams'];

export default {
  template: require('./authorize.html'),
  bindings: {
    strategy: '@',
    token: '@',
    user: '<',
    onCancel: '&',
    onAuthorized: '&'
  },
  controller: AuthorizeController
};