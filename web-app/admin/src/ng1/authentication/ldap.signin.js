import { textField } from 'material-components-web';

class LdapSigninController {
  constructor($element, $uibModal, UserService) {
    this.$element = $element;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
  }

  $postLink() {
    this.usernameField = new textField.MDCTextField(this.$element.find('.mdc-text-field')[0]);
    this.passwordField = new textField.MDCTextField(this.$element.find('.mdc-text-field')[1]);
  }

  signin() {
    this.UserService.ldapSignin({ username: this.username, password: this.password }).then(({ user, token }) => {
      this.onSignin({
        $event: {
          user: user,
          token: token, 
          strategy: this.strategy.name
        }
      });
    }, response => {
      this.statusTitle = 'Error signing in';
      this.statusMessage = response.data || 'Please check your username and password and try again.';
      this.usernameField.valid = false;
      this.passwordField.valid = false;
      this.info = {
        statusTitle: this.statusTitle,
        statusMessage: this.statusMessage,
        id: this.username
      };
      this.contactOpen = { opened: true };
    });
  }

  onContactClose() {
    this.contactOpen = { opened: false };
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

