window.jQuery = window.$ = require('jquery');

var angular = require('angular');

require('jquery-file-download');
require('jquery-minicolors');
require('angular-minicolors');
require('select2');
require('./vendor/bootstrap/js/bootstrap.min.js');

import '@uirouter/angularjs';

angular.module('mage', [
  require('angular-ui-bootstrap'),
  'ui.router',
  require('ui-select'),
  'minicolors',
  require('angular-animate'),
  require('angular-sanitize'),
  require('angular-route'),
  require('angular-resource'),
  require('angular-messages'),
  require('./app/auth/http-auth-interceptor')
]);

require('./img');
require('./css');
require('./app/app');
