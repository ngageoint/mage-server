var angular = require('angular');

angular
  .module('mage')
  .controller('AdminController', require('./admin.controller'))
  .directive('adminTab', require('./admin.tab.directive'));

require('./users');
require('./devices');
require('./events');
require('./layers');
require('./settings');
require('./teams');
