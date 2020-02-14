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
    this.UserService.oauthSignin(this.strategy.name).then(authData => {
      var user = authData.user;

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
          strategy: this.strategy.name
        }
      });
    }, data => {
      this.statusTitle = 'Error signing in';
      this.statusMessage = data.errorMessage;
      this.snackbar.open();
    });
  }
}

OAuthSigninController.$inject = ['$element', 'UserService'];

export default {
  template: require('./oauth.signin.html'),
  bindings: {
    strategy: '<',
    onSignin: '&'
  },
  controller: OAuthSigninController
};
