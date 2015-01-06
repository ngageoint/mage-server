/**
 * Animates the injection of new DOM elements by simply creating the DOM with a cl***REMOVED*** and then immediately removing it
 * Animations must be done using CSS3 transitions, but provide excellent flexibility
 *
 * @todo Add proper support for animating out
 * @param [options] {mixed} Can be an object with multiple options, or a string with the animation cl***REMOVED***
 *    cl***REMOVED*** {string} the CSS cl***REMOVED***(es) to use. For example, 'ui-hide' might be an excellent alternative cl***REMOVED***.
 * @example <li ng-repeat="item in items" ui-animate=" 'ui-hide' ">{{item}}</li>
 */
angular.module('ui.directives').directive('uiAnimate', ['ui.config', '$timeout', function (uiConfig, $timeout) {
  var options = {};
  if (angular.isString(uiConfig.animate)) {
    options['cl***REMOVED***'] = uiConfig.animate;
  } else if (uiConfig.animate) {
    options = uiConfig.animate;
  }
  return {
    restrict: 'A', // supports using directive as element, attribute and cl***REMOVED***
    link: function ($scope, element, attrs) {
      var opts = {};
      if (attrs.uiAnimate) {
        opts = $scope.$eval(attrs.uiAnimate);
        if (angular.isString(opts)) {
          opts = {'cl***REMOVED***': opts};
        }
      }
      opts = angular.extend({'cl***REMOVED***': 'ui-animate'}, options, opts);

      element.addCl***REMOVED***(opts['cl***REMOVED***']);
      $timeout(function () {
        element.removeCl***REMOVED***(opts['cl***REMOVED***']);
      }, 20, false);
    }
  };
}]);

