import angular from 'angular';
import leaflet from './leaflet.component';

angular.module('mage')
  .component('mageInfo', require('./mage-info.component.js'))
  .directive('banner', require('./banner.directive'))
  .directive('colorPicker', require('./color.picker.directive'))
  .directive('equals', require('./equals.directive'))
  .directive('newsFeed', require('./feed.directive'))
  .component('leaflet', leaflet);

require('./navbar');
require('./feed');