var angular = require('angular');

angular.module('mage')
  .component('observationFormView', require('./view.component.js'))
  .component('checkboxView', require('./checkbox.view.js'))
  .component('dateView', require('./date.view.js'))
  .component('geometryView', require('./geometry.view.js'))
  .component('multiselectdropdownView', require('./multiselectdropdown.view.js'))
  .component('passwordView', require('./password.view.js'))
  .component('textView', require('./text.view.js'))
  .component('textareaView', require('./textarea.view.js'));
