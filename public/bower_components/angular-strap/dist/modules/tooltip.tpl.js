/**
 * angular-strap
 * @version v2.2.1 - 2015-03-10
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
'use strict';

angular.module('mgcrea.ngStrap.tooltip').run(['$templateCache', function($templateCache) {

  $templateCache.put('tooltip/tooltip.tpl.html', '<div cl***REMOVED***="tooltip in" ng-show="title"><div cl***REMOVED***="tooltip-arrow"></div><div cl***REMOVED***="tooltip-inner" ng-bind="title"></div></div>');

}]);