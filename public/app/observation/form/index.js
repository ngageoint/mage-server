var angular = require('angular');

angular.module('mage')
  .directive('formDirective', require('./form.directive'))
  .component('observationFormEdit', require('./edit.component'))
  .component('checkboxEdit', require('./checkbox.edit'))
  .component('dateEdit', require('./date.edit'))
  .component('dropdownEdit', require('./dropdown.edit'))
  .component('emailEdit', require('./email.edit'))
  .component('geometryEdit', require('./geometry.edit'))
  .component('multiselectdropdownEdit', require('./multiselectdropdown.edit'))
  .component('numberEdit', require('./number.edit'))
  .component('passwordEdit', require('./password.edit'))
  .component('radioEdit', require('./radio.edit'))
  .component('textEdit', require('./text.edit'))
  .component('textareaEdit', require('./textarea.edit'));
