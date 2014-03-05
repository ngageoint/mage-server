angular.module('ui.bootstrap.bindHtml', [])

  .directive('bindHtmlU***REMOVED***fe', function () {
    return function (scope, element, attr) {
      element.addCl***REMOVED***('ng-binding').data('$binding', attr.bindHtmlU***REMOVED***fe);
      scope.$watch(attr.bindHtmlU***REMOVED***fe, function bindHtmlU***REMOVED***feWatchAction(value) {
        element.html(value || '');
      });
    };
  });