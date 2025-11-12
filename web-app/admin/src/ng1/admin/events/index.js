import angular from 'angular';
import events from './events.component';
import eventDelete from './event.delete.component';
import eventEdit from './event.edit.component';
import './forms/index.js';

angular.module('mage')
  .component('adminEvents', events)
  .component('adminEventDelete', eventDelete)
  .component('adminEventEdit', eventEdit);
