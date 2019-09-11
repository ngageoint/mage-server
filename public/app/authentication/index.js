import AuthenticationController from './authentication.controller';

var angular = require('angular');

angular.module('mage')
  .component('authentication', require('./authentication.component.js'))
  .component('localSignin', require('./local.signin.js'))
  .component('localSignup', require('./local.signup.js'))
  .component('ldapSignin', require('./ldap.signin.js'))
  .component('oauthSignin', require('./oauth.signin.js'))
  .component('authorize', require('./authorize.component.js'))
  .component('signin', require('./signin.component.js'))
  .controller('AuthenticationController', AuthenticationController)
  .controller('SigninController', require('./signin.controller'))
  .controller('SignupController', require('./signup.controller'))
  .controller('AuthorizeController', require('./authorize.controller'));
