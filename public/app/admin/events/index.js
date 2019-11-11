import angular from 'angular';
import adminEvent from './event.component';
import adminEvents from './events.component';
import adminEventEdit from './event.edit.component';
import adminEventDelete from './event.delete.component';
import adminEventAccess from './event.access.component';

angular.module('mage')
  .component('adminEvent', adminEvent)
  .component('adminEvents', adminEvents)
  .component('adminEventEdit', adminEventEdit)
  .component('adminEventDelete', adminEventDelete)
  .component('adminEventAccess', adminEventAccess);

import './forms/index.js';