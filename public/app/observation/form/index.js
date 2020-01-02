import angular from 'angular';
import geometryEdit from './geometry.edit.component';
import geometryEditMap from './geometry.edit.map.component';
import geometryEditForm from './geometry.edit.form.component';

angular.module('mage')
  .directive('formDirective', require('./form.directive'))
  .controller('DeleteObservationController', require('./delete-observation.controller'))
  .component('observationFormEdit', require('./edit.component'))
  .component('checkboxEdit', require('./checkbox.edit'))
  .component('dateEdit', require('./date.edit'))
  .component('dropdownEdit', require('./dropdown.edit'))
  .component('emailEdit', require('./email.edit'))
  .component('multiselectdropdownEdit', require('./multiselectdropdown.edit'))
  .component('numberEdit', require('./number.edit'))
  .component('passwordEdit', require('./password.edit'))
  .component('radioEdit', require('./radio.edit'))
  .component('textEdit', require('./text.edit'))
  .component('textareaEdit', require('./textarea.edit'))
  .component('geometryEdit', geometryEdit)
  .component('geometryEditMap', geometryEditMap)
  .component('geometryEditForm', geometryEditForm);
