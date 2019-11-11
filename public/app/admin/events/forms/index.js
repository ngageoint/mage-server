import angular from 'angular';

import adminFormPreview from './form.preview.component';
import adminFormCreate from './form.create.component';
import adminFormEdit from './form.edit.component';
import adminFormEditError from './form.edit.error.component';

angular.module('mage')
  .component('adminFormPreview', adminFormPreview)
  .component('adminFormEdit', adminFormEdit)
  .component('formCreate', adminFormCreate)
  .component('adminFormEditError', adminFormEditError);

import './map/index.js';
import './feed/index.js';
import './fields/index.js';