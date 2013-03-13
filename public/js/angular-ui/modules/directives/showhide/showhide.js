/**
 * uiShow Directive
 *
 * Adds a 'ui-show' cl***REMOVED*** to the element instead of display:block
 * Created to allow tighter control  of CSS without bulkier directives
 *
 * @param expression {boolean} evaluated expression to determine if the cl***REMOVED*** should be added
 */
angular.module('ui.directives').directive('uiShow', [function () {
  return function (scope, elm, attrs) {
    scope.$watch(attrs.uiShow, function (newVal, oldVal) {
      if (newVal) {
        elm.addCl***REMOVED***('ui-show');
      } else {
        elm.removeCl***REMOVED***('ui-show');
      }
    });
  };
}])

/**
 * uiHide Directive
 *
 * Adds a 'ui-hide' cl***REMOVED*** to the element instead of display:block
 * Created to allow tighter control  of CSS without bulkier directives
 *
 * @param expression {boolean} evaluated expression to determine if the cl***REMOVED*** should be added
 */
  .directive('uiHide', [function () {
  return function (scope, elm, attrs) {
    scope.$watch(attrs.uiHide, function (newVal, oldVal) {
      if (newVal) {
        elm.addCl***REMOVED***('ui-hide');
      } else {
        elm.removeCl***REMOVED***('ui-hide');
      }
    });
  };
}])

/**
 * uiToggle Directive
 *
 * Adds a cl***REMOVED*** 'ui-show' if true, and a 'ui-hide' if false to the element instead of display:block/display:none
 * Created to allow tighter control  of CSS without bulkier directives. This also allows you to override the
 * default visibility of the element using either cl***REMOVED***.
 *
 * @param expression {boolean} evaluated expression to determine if the cl***REMOVED*** should be added
 */
  .directive('uiToggle', [function () {
  return function (scope, elm, attrs) {
    scope.$watch(attrs.uiToggle, function (newVal, oldVal) {
      if (newVal) {
        elm.removeCl***REMOVED***('ui-hide').addCl***REMOVED***('ui-show');
      } else {
        elm.removeCl***REMOVED***('ui-show').addCl***REMOVED***('ui-hide');
      }
    });
  };
}]);
