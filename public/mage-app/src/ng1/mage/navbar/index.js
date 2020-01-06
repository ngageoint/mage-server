var angular = require('angular');

angular.module('mage')
  .component('navbar', require('./navbar.component'))
  .component('pollingButton', require('./polling-button.component'))
  .component('preferencesButton', require('./preferences-button.component'))
  .component('exportButton', require('./export-button.component'))
  .component('filterButton', require('./filter-button.component'));
