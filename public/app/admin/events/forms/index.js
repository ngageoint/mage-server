import angular from 'angular';

import adminFormPreview from './form.preview.component';
import adminFormCreate from './form.create.component';
import adminFormEdit from './form.edit.component';
import adminFormFieldsEdit from './form.fields.edit.component';
import adminFormMapEdit from './form.map.edit.component';
import adminFormMapIconPicker from './form.map.icon.picker.component';
import adminFormMapSymbologyView from './style.component';

angular.module('mage')
  .controller('AdminEventEditFormFeedController', require('./event.edit.form.feed.controller'))
  .directive('stylePreview', require('./style-preview.directive'))
  .component('adminFormPreview', adminFormPreview)
  .component('adminFormEdit', adminFormEdit)
  .component('adminFormFieldsEdit', adminFormFieldsEdit)
  .component('adminFormMapEdit', adminFormMapEdit)
  .component('adminFormMapSymbologyView', adminFormMapSymbologyView)
  .component('formMapIconPicker', adminFormMapIconPicker)
  .component('formCreate', adminFormCreate);
