import angular from 'angular';

import formCreate from './form.create.component';
import formEdit from './form.edit.component';
import formEditError from './form.edit.error.component';
import formEditUnsaved from './form.edit.unsaved.component';

angular.module('mage')
  .component('adminEventFormEdit', formEdit)
  .component('adminEventFormCreate', formCreate)
  .component('adminEventFormEditError', formEditError)
  .component('adminEventFormEditUnsaved', formEditUnsaved);

import './map/index.js';
import './feed/index.js';
import './fields/index.js';