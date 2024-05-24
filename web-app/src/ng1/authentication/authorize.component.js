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
    this._UserService.authorize(this.token, null).then(() => {
      this.onAuthorized();
    }).catch(() => {
      this.showAuthorize = true;
    });
  }

  authorize() {
    const token = this._$stateParams.token || this.token;
    this._UserService.authorize(token, this.uid)
    .then(authz => {
      if (authz.device.registered) {
        this.onAuthorized({ device: authz });
      }
      else {
        this.status = authz.status;
        this.statusTitle = 'Invalid Device ID';
        this.statusMessage = authz.errorMessage || 'Device ID is invalid, please check your device ID, and try again.';
        this.deviceIdField.valid = false;
        this.statusLevel = 'alert-warning';
        this.info = {
          statusTitle: this.statusTitle,
          statusMessage: this.statusMessage,
          id: this.uid
        };
        this.contactOpen = { opened: true };
      }
    })
    .catch(res => {
      if (res.status === 403) {
        this.status = res.status;
        this.statusTitle = 'Invalid Device ID';
        this.statusMessage = res.errorMessage || 'Device ID is invalid, please check your device ID, and try again.';
        this.deviceIdField.valid = false;
        this.statusLevel = 'alert-warning';
      } else if (res.status === 401) {
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