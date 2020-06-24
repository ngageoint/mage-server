import { textField, snackbar } from 'material-components-web';

class LdapSigninController {
  constructor($element, $uibModal, UserService) {
    this.$element = $element;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this.$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this.$element.find('.mdc-text-field')[1]);
    this.snackbar = new snackbar.MDCSnackbar(this.$element.find('.mdc-snackbar')[0]);
  }

  signin() {
    this.UserService.ldapSignin({ username: this.username, password: this.password }).then(response => {
      const user = response.user;

      // User has an account, but its not active
      if (!user.active) {
        this.showStatus = true;
        this.statusTitle = 'Account Created';
        this.statusMessage = 'Please contact a MAGE administrator to activate your account.';
        this.snackbar.open();
        return;
      }

      this.onSignin({
        $event: {
          user: user,
          token: response.token, 
          strategy: this.strategy.name
        }
      });
    }, response => {
      this.statusTitle = 'Error signing in';
      this.statusMessage = response.data || 'Please check your username and password and try again.';
      this.usernameField.valid = false;
      this.passwordField.valid = false;
      this.snackbar.open();
    });
  }
}

LdapSigninController.$inject = ['$element', '$uibModal', 'UserService'];

export default {
  template: require('./ldap.signin.html'),
  bindings: {
    strategy: '<',
    onSignin: '&'
  },
  controller: LdapSigninController
};

