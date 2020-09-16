"use strict";

import { textField, linearProgress, snackbar } from 'material-components-web';
import zxcvbn from 'zxcvbn';

const passwordStrengthMap = {
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
  constructor($q, $http, $element, UserService) {
    this.$q = $q;
    this._$http = $http;
    this._UserService = UserService;
    this._$element = $element;

    this.account = {};
    this.pages = ['account', 'device'];
    this.page = this.pages[0];

    this.form = {};
    this.status = null;
    this.statusMessage = null;
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[1]);
    this.passwordConfirmField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[2]);
    this.deviceIdField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[3]);
    this.passwordStrengthProgress = new linearProgress.MDCLinearProgress(this._$element.find('.mdc-linear-progress')[0]);
    this.passwordConfirmField.useNativeValidation = false;
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
  }

  onPasswordChange() {
    const score = this.account.password && this.account.password.length ? zxcvbn(this.account.password, [this.account.username]).score : 0;
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

    const index = this.pages.indexOf(this.page);
    this.page = this.pages[index + 1];
  }

  finish() {
    this._$http.post('/api/setup', this.account, {headers: { 'Content-Type': 'application/json' }}).success(() => {
      // Login the user after setup is complete
      this._UserService.signin({username: this.account.username, password: this.account.password}).then(response => {
        this._UserService.authorize(response.token, this.account.uid).success(data => {
          this.onSetupComplete({device: data});
        })
      }, response => {
        this.showError(response.data || 'Please check server logs for more information.')
      });
    }).error(data => {
      this.showError(data || 'Please check server logs for more information.')
    });
  }

  showError(message) {
    this.statusTitle = 'Setup Error';
    this.statusMessage = message || 'Please check server logs for more information.';
    this.snackbar.open();
  }
}

SetupController.$inject = ['$q', '$http', '$element', 'UserService'];

const template = require('./setup.html');
const bindings = {
  api: '<',
  onSetupComplete: '&'
};
const controller = SetupController;

export {
  template,
  bindings,
  controller
};