import { textField, linearProgress, snackbar} from 'material-components-web';
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

class LocalSignupController {
  constructor(UserService, $element, $timeout) {
    this._UserService = UserService;
    this._$element = $element;
    this._$timeout = $timeout;
    this.passwordStrengthScore = 0;
  }

  $onInit() {
    this.account = {};
  }

  $postLink() {
    const elements = this._$element.find('.mdc-text-field');
    for (let i = 0; i < elements.length; i++) {
      const textfield = new textField.MDCTextField(elements[i]);
      if (i === 0) {
        this.usernameField = textfield;
      } else if (i === elements.length - 2) {
        this.passwordField = textfield;
      } else if (i === elements.length - 1) {
        this.captchaTextField = textfield;
      }
    }

    this.passwordStrengthProgress = new linearProgress.MDCLinearProgress(this._$element.find('.mdc-linear-progress')[0]);
    this.captchaProgess = new linearProgress.MDCLinearProgress(this._$element.find('.mdc-linear-progress')[1]);
    this.captchaProgess.getDefaultFoundation().setDeterminate(false);
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
    this.snackbar = new snackbar.MDCSnackbar(this._$element.find('.mdc-snackbar')[0]);
  }

  getCaptcha() {
    this.loadingCaptcha = true;
    this._UserService.signup(this.account.username).then(data => {
      this.captcha = {
        uri: data.captcha,
        token: data.token
      }

      this.loadingCaptcha = false;
    });
  }

  verify(form) {
    this.passwordField.valid = form.passwordconfirm.$valid = this.account.password === this.account.passwordconfirm;

    if (!form.$valid) return;

    this._UserService.signupVerify(this.account, this.captcha.token).then(response => {
      this.signupComplete(response);
    }, response => {
      if (response.status === 401) {
        this.getCaptcha();
      } else if (response.status === 409) {
        // username exists
        this.captcha = {};
        this.captchaTextField.value = "";
        this.usernameField.valid = form.username.valid = false;
        form.username.$valid = false;
        form.captchaText.$valid = false;
      }

      this.signupFailed(response);
    });
  }

  signupComplete(data) {
    this.account = {};
    this.onSuccess();
    if (data && data.active) {
      this.showStatusMessage("Success", "Your account has been created and is now active.");
    } else {
      this.showStatusMessage("Success", "Your account has been created but it is not active.  An administrator needs to activate your account before you can log in.");
    }
  }

  signupFailed(response) {
    this.showStatusMessage("Could Not Create Account", response.data);
  }

  onPasswordChange() {
    const score = this.account.password && this.account.password.length ? zxcvbn(this.account.password, [this.account.username, this.account.displayName, this.account.email]).score : 0;
    this.passwordStrengthScore = score + 1;
    this.passwordStrengthType = passwordStrengthMap[score].type;
    this.passwordStrength = passwordStrengthMap[score].text;
    this.passwordStrengthProgress.progress = this.passwordStrengthScore / 5;
  }

  showStatusMessage(title, message) {
    this.statusTitle = title;
    this.statusMessage = message;
    this.snackbar.open();
  }
}

LocalSignupController.$inject = ['UserService', '$element', '$timeout'];

export default {
  template: require('./local.signup.html'),
  bindings: {
    strategy: '<',
    onCancel: '&',
    onSuccess: '&'
  },
  controller: LocalSignupController
};
