var angular = require('angular');

angular.module('mage')
  .filter('filename', require('./filename.filter'))
  .filter('filesize', require('./filesize.filter'))
  .filter('geometry', require('./geometry.filter'))
  .filter('moment', require('./moment.filter'))
  .filter('offset', require('./paging-offset.filter'))
  .filter('password', require('./password.filter'))
  .filter('polling', require('./polling.filter'))
  .filter('user', require('./user.filter'));
