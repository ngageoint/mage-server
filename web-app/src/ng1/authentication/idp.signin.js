import { snackbar } from 'material-components-web';

class OAuthSigninController {
  constructor($element, UserService) {
    this.$element = $element;
    this.UserService = UserService;
  }

  $postLink() {
    this.snackbar = new snackbar.MDCSnackbar(this.$element.find('.mdc-snackbar')[0]);
  }

  signin() {
    this.UserService.idpSignin(this.strategy.name).then(({ user, token }) => {
      if (!token || !user) {
        this.statusTitle = 'Signin Failed';
        this.statusMessage = 'There was a problem signing in, Please contact a MAGE administrator for assistance.';
        this.snackbar.open();
        return;
      }

      // User has an account, but its not active
      if (!user.active) {
        this.statusTitle = 'Account Created';
        this.statusMessage = 'Please contact a MAGE administrator to activate your account.';
        this.snackbar.open();
        return;
      }

      this.onSignin({
        $event: {
          user: user,
          token: token,
          strategy: this.strategy.name
        }
      });
    }, ({errorMessage}) => {
      this.statusTitle = 'Error signing in';
      this.statusMessage = errorMessage;
      this.snackbar.open();
    });
  }
}

OAuthSigninController.$inject = ['$element', 'UserService'];

export default {
  template: require('./idp.signin.html'),
  bindings: {
    strategy: '<',
    onSignin: '&'
  },
  controller: OAuthSigninController
};
