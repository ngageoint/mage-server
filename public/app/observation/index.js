var angular = require('angular');

require('./form');
require('./property');

angular.module('mage')
  .directive('attachment', require('./observation-attachment.directive'))
  .directive('mapClip', require('./observation-map-clip.directive'))
  .directive('observationNewsItem', require('./observation-feed.directive'))
  .directive('observationView', require('./observation-view.directive'))
  .directive('observationPopup', require('./observation-popup.directive'));
