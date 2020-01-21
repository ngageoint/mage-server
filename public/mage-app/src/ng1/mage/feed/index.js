var angular = require('angular');

angular.module('mage')
  .component('observationFeed', require('./observation-feed.component'))
  .component('userFeed', require('./user-feed.component'))
  .component('tabList', require('./tab-list.component'));
