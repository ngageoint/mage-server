import angular from 'angular';
import banner from './banner.component';
import leaflet from './leaflet.component';

angular.module('mage')
  .directive('colorPicker', require('./color.picker.directive'))
  .directive('equals', require('./equals.directive'))
  .component('banner', banner)
  .component('leaflet', leaflet);

require('./navbar');