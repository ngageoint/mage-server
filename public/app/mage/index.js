import angular from 'angular';

angular.module('mage')
  .component('mageInfo', require('./mage-info.component.js'))
  .directive('banner', require('./banner.directive'))
  .directive('colorPicker', require('./color.picker.directive'))
  .directive('equals', require('./equals.directive'))
  .directive('newsFeed', require('./feed.directive'))
  .directive('leaflet', require('./leaflet.directive'));

require('./navbar');
require('./feed');