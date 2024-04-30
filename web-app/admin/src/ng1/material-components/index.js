var angular = require('angular');

angular.module('mage')
  .component('mdcMenu', require('./menu.component'))
  .component('mdcSnackbar', require('./snackbar.component'))
  .component('typeaheadSelect', require('./typeahead.select.component'))
  .component('multiselect', require('./multiselect.component'));
