import landing from './landing.js';
import signin from './signin.component.js';
import localSignin from './local.signin.js';
import localSignup from './local.signup.js';
import oauthSignin from './oauth.signin.js';
import ldapSignin from './ldap.signin.js';
import authorize from './authorize.component.js';
import authentication from './authentication.component.js';

var angular = require('angular');

angular.module('mage')
  .component('landing', landing)
  .component('authentication', authentication)
  .component('localSignin', localSignin)
  .component('localSignup', localSignup)
  .component('ldapSignin', ldapSignin)
  .component('oauthSignin', oauthSignin)
  .component('authorize', authorize)
  .component('signin', signin);