import { textField, linearProgress } from 'material-components-web';
import zxcvbn from 'zxcvbn';
import _ from 'underscore';

var passwordStrengthMap = {
  0: {
    type: 'danger',
    text: 'Weak'
  },
  1: {
    type: 'warning',
    text: 'Fair'
  },
  2: {
    type: 'info',
    text: 'Good'
  },
  3: {
    type: 'primary',
    text: 'Strong'
  },
  4: {
    type: 'success',
    text: 'Excellent'
  }
};


class SetupController {
  constructor($q, $http, $element, UserService, Settings) {
    this.$q = $q;
    this._$http = $http;
    this._UserService = UserService;
    this._$element = $element;
    this.Settings = Settings;

    this.account = {};
    this.pages = ['account', 'device'];
    this.page = this.pages[0];

    this.passwordRequirements = {};

    this.form = {};
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[1]);
    this.passwordConfirmField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[2]);
    this.deviceIdField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[3]);
    this.passwordStrengthProgress = new linearProgress.MDCLinearProgress(this._$element.find('.mdc-linear-progress')[0]);
    this.passwordConfirmField.useNativeValidation = false;
  }

  $onInit() {
    this.$q.all({
      settings: this.Settings.query().$promise
    }).then(result => {
      const settings = settings = _.indexBy(result.settings, 'type');
      const security = settings.security ? settings.security.settings : {};

      if (security['local'] && security['local'].passwordPolicy && security['local'].passwordPolicy.passwordMinLengthEnabled) {
        this.passwordRequirements.minLength = security['local'].passwordPolicy.passwordMinLength;
      }
    });
  }

  onPasswordChange() {
    var score = this.account.password && this.account.password.length ? zxcvbn(this.account.password, [this.account.username]).score : 0;
    this.passwordStrengthScore = score + 1;
    this.passwordStrengthType = passwordStrengthMap[score].type;
    this.passwordStrength = passwordStrengthMap[score].text;
    this.passwordStrengthProgress.progress = this.passwordStrengthScore / 5;
  }

  onPasswordConfirmChange() {
    this.passwordConfirmField.valid = this.account.password === this.account.passwordconfirm;
  }

  next() {
    if (this.form[this.page].$invalid) {
      return;
    }

    var index = this.pages.indexOf(this.page);
    this.page = this.pages[index + 1];
  }

  finish() {
    this._$http.post('/api/setup', this.account, { headers: { 'Content-Type': 'application/json' } }).success(() => {
      // login the user
      this._UserService.signin({ username: this.account.username, password: this.account.password }).then(response => {
        var user = response.user;

        this._UserService.authorize('local', user, false, { uid: this.account.uid }).success(data => {
          if (data.device.registered) {
            this.onSetupComplete({ device: data });
          }
        });
      }, response => {
        this.showStatus = true;
        this.statusTitle = 'Error signing in';
        this.statusMessage = response.data || 'Please check your username and password and try again.';
        this.statusLevel = 'alert-danger';
      });
    }).error(function () {
    });
  }
}

SetupController.$inject = ['$q', '$http', '$element', 'UserService', 'Settings'];

var template = require('./setup.html');
var bindings = {
  api: '<',
  onSetupComplete: '&'
};
var controller = SetupController;

export {
  template,
  bindings,
  controller
};