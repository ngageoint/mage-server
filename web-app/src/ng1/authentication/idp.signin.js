class OAuthSigninController {
  constructor($element, UserService) {
    this.$element = $element;
    this.UserService = UserService;
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
        this.info = {
          statusTitle: this.statusTitle,
          statusMessage: this.statusMessage,
          id: user
        };
        this.contactOpen = { opened: true };
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
      this.info = {
        statusTitle: this.statusTitle,
        statusMessage: this.statusMessage,
        id: user
      };
      this.contactOpen = { opened: true };
    });
  }

  onContactClose() {
    this.contactOpen = { opened: false };
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
