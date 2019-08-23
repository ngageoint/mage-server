var angular = require('angular');

angular.module('mage')
  .component('typeaheadSelect', require('./typeahead.select.component'))
  .component('multiselect', require('./multiselect.component'));
