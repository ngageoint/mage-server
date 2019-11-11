import angular from 'angular';
import adminEvent from './event.component';
import adminEvents from './events.component';
import adminEventEdit from './event.edit.component';
import adminEventDelete from './event.delete.component';
import adminEventAccess from './event.access.component';

// Forms
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
  .component('adminEvent', adminEvent)
  .component('adminEvents', adminEvents)
  .component('adminEventEdit', adminEventEdit)
  .component('adminEventDelete', adminEventDelete)
  .component('adminEventAccess', adminEventAccess)
  .component('adminFormPreview', adminFormPreview)
  .component('adminFormEdit', adminFormEdit)
  .component('adminFormFieldsEdit', adminFormFieldsEdit)
  .component('adminFormMapEdit', adminFormMapEdit)
  .component('adminFormMapSymbologyView', adminFormMapSymbologyView)
  .component('formMapIconPicker', adminFormMapIconPicker)
  .component('formCreate', adminFormCreate)
  .filter('events', require('./events.filter'));