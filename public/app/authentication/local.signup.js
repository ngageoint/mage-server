import {textField, linearProgress, snackbar} from 'material-components-web';
import zxcvbn from 'zxcvbn';

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

class LocalSignupController {
  constructor(UserService, $element, $timeout) {
    this._UserService = UserService;
    this._$element = $element;
    this._$timeout = $timeout;
    this.passwordStrengthScore = 0;
  }

  $onInit() {
    this.user = {};
  }

  $postLink() {
    var elements = this._$element.find('.mdc-text-field');
    for (var i = 0; i < elements.length; i++) {
      if (i === elements.length - 1) {
        this.passwordconfirm = new textField.MDCTextField(elements[i]);
      } else {
        new textField.MDCTextField(elements[i]);
      }
    }
    this.passwordStrengthProgress = new linearProgress.MDCLinearProgress(this._$element.find('.mdc-linear-progress')[0]);
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
  }

  signup(form) {
    this.passwordconfirm.valid = this.user.password === this.user.passwordconfirm;

    if (!form.$valid) return;

    var user = {
      username: this.user.username,
      displayName: this.user.displayName,
      email: this.user.email,
      phone: this.user.phone,
      password: this.user.password,
      passwordconfirm: this.user.passwordconfirm
    };
    this._UserService.signup(user, this.signupComplete.bind(this), this.signupFailed.bind(this));
  }

  signupComplete() {
    this._$timeout(() => {
      this.user = {};
      this.passwordStrengthScore = 0;
      this.onSuccess();
      this.showStatusMessage("Success", "Account created, contact an administrator to activate your account.");
    });
  }

  signupFailed(data) {
    this._$timeout(() => {
      this.showStatusMessage("There was a problem creating your account", data.responseText);
    });
  }

  onPasswordChange() {
    var score = this.user.password && this.user.password.length ? zxcvbn(this.user.password, [this.user.username, this.user.displayName, this.user.email]).score : 0;
    this.passwordStrengthScore = score + 1;
    this.passwordStrengthType = passwordStrengthMap[score].type;
    this.passwordStrength = passwordStrengthMap[score].text;
    this.passwordStrengthProgress.progress = this.passwordStrengthScore/5;
  }

  showStatusMessage(title, message) {
    this.statusTitle = title;
    this.statusMessage = message;
    this.snackbar.open();
  }
}

LocalSignupController.$inject = ['UserService', '$element', '$timeout'];

var template = require('./local.signup.html');
var bindings = {
  strategy: '<',
  onCancel: '&',
  onSuccess: '&'
};
var controller = LocalSignupController;

export {
  template,
  bindings,
  controller
};
