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
        let message = 'There was a problem signing in, Please contact a MAGE administrator for assistance.';
        if (user) {
          if (!user.active) {
            message = 'Your account has been created but it is not active. A MAGE administrator needs to activate your account before you can log in.';
          } else if (!user.enabled) {
            message = 'Your account has been disabled, please contact a MAGE administrator for assistance.'
          }
        }

        this.statusTitle = 'Signin Failed';
        this.statusMessage = message
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
