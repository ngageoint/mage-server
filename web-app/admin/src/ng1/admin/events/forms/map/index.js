import angular from 'angular';
import mapEdit from './map.edit.component';
import mapShape from './map.shape.component';
import symbology from './map.symbology.component';
import symbologyEdit from './map.symbology.edit.component';

angular.module('mage')
  .component('adminEventFormMapEdit', mapEdit)
  .component('adminEventFormMapShape', mapShape)
  .component('adminEventFormMapSymbology', symbology)
  .component('adminEventFormMapSymbologyEdit', symbologyEdit);