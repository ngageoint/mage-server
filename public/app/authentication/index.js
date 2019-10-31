import landing from './landing.js';
import authentication from './authentication.component.js';
import signup from './signup.component.js';

var angular = require('angular');

angular.module('mage')
  .component('landing', landing)
  .component('authentication', authentication)
  .component('localSignin', require('./local.signin.js'))
  .component('localSignup', require('./local.signup.js'))
  .component('ldapSignin', require('./ldap.signin.js'))
  .component('oauthSignin', require('./oauth.signin.js'))
  .component('authorize', require('./authorize.component.js'))
  .component('signin', require('./signin.component.js'))
  .component('signup', signup)
  .controller('SigninController', require('./signin.controller'))
  .controller('AuthorizeController', require('./authorize.controller'));
