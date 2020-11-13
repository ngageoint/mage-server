import angular from 'angular';
import observationForm from './form.component';
import geometryEdit from './geometry.edit.component';
import geometryEditMap from './geometry.edit.map.component';
import geometryEditForm from './geometry.edit.form.component';

angular.module('mage')
  .controller('DeleteObservationController', require('./delete-observation.controller'))
  .component('observationFormEdit', require('./edit.component'))
  .component('dateEdit', require('./date.edit'))
  .component('observationForm', observationForm)
  .component('geometryEdit', geometryEdit)
  .component('geometryEditMap', geometryEditMap)
  .component('geometryEditForm', geometryEditForm);
