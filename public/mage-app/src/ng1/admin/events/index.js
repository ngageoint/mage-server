import angular from 'angular';
import event from './event.component';
import events from './events.component';
import eventEdit from './event.edit.component';
import eventDelete from './event.delete.component';
import eventAccess from './event.access.component';

angular.module('mage')
  .component('adminEvent', event)
  .component('adminEvents', events)
  .component('adminEventEdit', eventEdit)
  .component('adminEventDelete', eventDelete)
  .component('adminEventAccess', eventAccess);

import './forms/index.js';