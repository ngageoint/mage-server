import angular from 'angular';
import fieldsEdit from './fields.edit.component';
import fieldOptionReorder from './field.option.reorder.component';

angular.module('mage')
  .component('adminEventFormFieldsEdit', fieldsEdit)
  .component('adminEventFormFieldOptionReorder', fieldOptionReorder);
